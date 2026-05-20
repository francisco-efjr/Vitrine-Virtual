# Try-On Tiers — Developer Handoff

> **Status: Gemini-only (Tier C). Tier A / Tier B are stubs.**
> **Last updated:** 2026-05-19

## Why this directory exists

The product research (root: `VITRINE_VIRTUAL_TRY_ON_RESEARCH_AND_PROMPT_SYSTEM.md`)
recommends a **two-pass premium pipeline** as the highest-quality strategy:

```
FASHN Tryon v1.6 (garment fidelity)  →  Gemini 2.5 Flash Image (face anchor + background)
```

But Vitrine Virtual currently has budget for **Gemini only**. So this directory
holds the **routing skeleton** with one live tier and two stubs. The day budget
arrives, flipping Tier A on should be a small, well-scoped task: implement
one `run()` function and toggle one env flag.

## The three tiers

| Tier | What it is | Status today | Cost / image | Use when |
|---|---|---|---|---|
| `tier_a_premium` | FASHN → Gemini two-pass | **STUB** | ~ $0.10–$0.14 | Default for premium output (research §4) |
| `tier_b_economy` | FASHN single-call | **STUB** | ~ $0.04 | `quality=fast` + `preserve_customer` background |
| `tier_c_gemini` | Single Gemini call | **ACTIVE** | ~ $0.039 | Identity-sensitive cases AND today's default |

## What's wired today (Gemini-only)

- `tier-c-gemini.ts` calls the existing `googleAiProvider` (no changes to it).
- The router (`index.ts`) always lands on Tier C because Tier A / Tier B have
  `enabled = false`. The router still **chooses** the ideal tier per request
  (see `chooseTier`) so analytics show the "ideal-vs-actual" gap — useful when
  pitching for budget later.
- The new prompt composer (`../prompts/compose.ts`) layers the section 13
  variants and the section 11 negative prompt onto the existing master
  prompt without touching `virtual-try-on-prompt.ts`. This keeps the current
  Gemini behavior identical unless you opt into the composer.

## How to call the new stack from the use-case layer

```ts
import { composeFinalPrompt } from '@/lib/try-on/prompts/compose'
import { chooseTier, runTier, type TryOnPromptVariables } from '@/lib/try-on/tiers'
import { buildTryOnProviderInput } from '@/lib/try-on/payload'
import {
  evaluateCustomerPhoto,
  evaluateGarmentPhoto,
  combineGateResults,
} from '@/lib/try-on/quality-gate'

// 1. Quality gate (signals come from the client + a server-side double-check)
const customerResult = evaluateCustomerPhoto(customerSignals, {
  garmentCategory: 'tops',
})
const garmentResult = evaluateGarmentPhoto(garmentSignals)
const gate = combineGateResults(customerResult, garmentResult)
if (gate.verdict === 'reject') return { ok: false, error: gate.reason }

// 2. Resolve prompt variables
const variables: TryOnPromptVariables = {
  customerPhotoType: customerSignals.detectedType,
  garmentPhotoType: garmentSignals.detectedPhotoType,
  garmentCategory: 'tops',
  backgroundMode: 'white',
  quality: 'quality',
  outputStyle: 'premium_studio',
  promptVariantId: 'v1.0-master+variants+negative',
  safetyLevel: 'conservative',
}

// 3. Compose final prompt (master + variants + negative)
// (Today's Gemini provider already builds the prompt internally. The
// composer is here so we can A/B-test the new prompt variants without
// shipping a second provider. To use it, call composeFinalPrompt and pass
// the result into a new variant of googleAiProvider that reads from a
// `promptOverride` field — see the comment in google-ai.ts.)
const { prompt, promptVariantId } = composeFinalPrompt(variables)

// 4. Tier dispatch
const chosen = chooseTier({
  customerPhotoType: variables.customerPhotoType,
  garmentCategory: variables.garmentCategory,
  backgroundMode: variables.backgroundMode,
  quality: variables.quality,
})
const providerInput = buildTryOnProviderInput({
  customerPhoto: customerDataUrl,
  productImage: garmentUrl,
  background: { mode: 'white' },
  googleModelOverride: null,
})
const result = await runTier(chosen, { provider: providerInput, variables })

// `result.tier` tells you which tier actually ran (may be Tier C even when
// Tier A was chosen, if Tier A is disabled). Store both `chosen` and
// `result.tier` in the generation log.
```

## Turning Tier A on (when budget arrives)

1. **Provider setup.** Add to `.env.local`:
   ```
   FASHN_API_KEY=...
   FASHN_API_BASE_URL=https://api.fashn.ai/v1
   TRY_ON_TIER_A_ENABLED=true
   ```
2. **Implement `tier-a-premium.ts` `run()`.** The top-of-file comment is a
   step-by-step checklist (Stage 1 FASHN call → Stage 2 Gemini polish).
   The existing `fashn.ts` already has a working poll loop you can lift.
3. **Wire acceptance checks.** Replace the stubs in `../acceptance/index.ts`
   with the real implementations described in their inline TODOs. The
   thresholds live in `../quality-gate/thresholds.ts` so QA can tune them
   without code changes.
4. **Quota math.** Update `_app/src/server/try-on/quota.ts` so Tier A
   counts double (it really is roughly 2× the cost).
5. **Rollout.** Start with one pilot store via `store_model_preference =
   'tier_a_premium'` on the `lojas` row. Watch the feedback dashboard.
   When the positive-feedback rate is at least 5pp above Tier C, flip the
   default in `chooseTier`.

## Tier B follow-up

If you want a cheap "FASHN-only single call, balanced mode, preserve
background" path, repeat the steps above for `tier-b-economy.ts`. The body
of `run()` is just the FASHN Stage 1 from Tier A with `mode: "balanced"` and
no Stage 2.

## What the dev should NOT do

- **Do not delete `fashn.ts`, `replicate.ts`, `openai.ts`.** They are still
  referenced by the legacy `orchestrator.ts`. Leaving them in place means
  any environment that *does* have those keys keeps working. The tier system
  is purely additive.
- **Do not call `googleAiProvider.generate(...)` directly from new code.**
  Always go through `runTier` so the routing decision is logged.
- **Do not retrain any model.** We do not have model-training capability and
  do not advertise one to customers. The feedback loop only drives prompt
  A/B and threshold tuning — see `../feedback/types.ts`.

## File map

```
_app/src/lib/try-on/
├── tiers/
│   ├── README.md              ← you are here
│   ├── types.ts               ← TryOnTier, TierHandler, prompt variables
│   ├── index.ts               ← chooseTier + runTier router
│   ├── tier-a-premium.ts      ← STUB — FASHN+Gemini two-pass
│   ├── tier-b-economy.ts      ← STUB — single-call FASHN
│   └── tier-c-gemini.ts       ← ACTIVE — single-call Gemini
├── prompts/
│   ├── virtual-try-on-prompt.ts  ← existing master prompt (unchanged)
│   ├── variants.ts               ← NEW — section 13 prompt deltas
│   ├── negative-prompt.ts        ← NEW — section 11 negative prompt
│   └── compose.ts                ← NEW — master + variants + negative
├── quality-gate/
│   ├── types.ts               ← signals + verdict types
│   ├── thresholds.ts          ← tunable numeric thresholds
│   ├── rejection-messages.ts  ← EN + PT-BR customer-facing copy
│   └── index.ts               ← evaluateCustomerPhoto / evaluateGarmentPhoto
├── acceptance/
│   └── index.ts               ← post-generation checks (stubs with TODOs)
├── feedback/
│   └── types.ts               ← Yes/No + reason schema (section 9)
└── (existing files: fashn.ts, replicate.ts, openai.ts, google-ai.ts,
    orchestrator.ts, payload.ts, model-selection.ts, types.ts — UNCHANGED)
```

## Reference

The full research document lives at the repo root:
`VITRINE_VIRTUAL_TRY_ON_RESEARCH_AND_PROMPT_SYSTEM.md`.

It contains the model comparison, the customer instructions, the background
strategy, the acceptance thresholds, and every prompt variant referenced
above. Treat it as the spec of record.

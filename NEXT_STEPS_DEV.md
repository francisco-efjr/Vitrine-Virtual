# Next Steps — Dev Handoff for the Try-On Pipeline

> Read this **before** opening any code. 5 minutes.
> **Last updated:** 2026-05-19

## What just happened

I dropped a tiered Virtual Try-On architecture into the repo. Today only
**one tier is live (Gemini-only)**, because there is no budget for FASHN
or any paid VTON API. The other two tiers are wired-up *stubs* so that, the
moment a budget arrives, turning them on is a small, well-scoped task —
not a re-architecture.

Two new top-level files for you to read:

1. **`VITRINE_VIRTUAL_TRY_ON_RESEARCH_AND_PROMPT_SYSTEM.md`** — the full
   research report (model comparison, prompt strategy, acceptance criteria,
   background strategy, feedback loop, customer copy). Treat it as the
   product spec.

2. **`_app/src/lib/try-on/tiers/README.md`** — the developer handoff. Tells
   you how to call the new stack, how to flip Tier A on later, and what
   *not* to touch.

## What runs in production today

```
Customer photo + garment photo
         │
         ▼
  Quality gate (signals from MediaPipe on the client)
         │
         ▼
  Tier router  ─► chooses tier_a_premium (preferred)
         │       …but Tier A is disabled, so falls back to:
         ▼
  tier_c_gemini  ─► single call to Gemini 2.5 Flash Image
         │
         ▼
  Acceptance checks (stubs — logged, not blocking)
         │
         ▼
  Result + Yes/No feedback widget
```

## What changed in the code

- **Added** `_app/src/lib/try-on/tiers/` — the router + 3 tier handlers.
- **Added** `_app/src/lib/try-on/prompts/variants.ts` — section 13 deltas
  (full-body, mirror, selfie, partial body, on-model garment, etc.).
- **Added** `_app/src/lib/try-on/prompts/negative-prompt.ts` — section 11.
- **Added** `_app/src/lib/try-on/prompts/compose.ts` — composes master +
  variants + negative.
- **Added** `_app/src/lib/try-on/quality-gate/` — verdict logic, thresholds,
  EN+PT-BR rejection messages.
- **Added** `_app/src/lib/try-on/acceptance/index.ts` — post-generation
  checks (stubs with TODOs for each check).
- **Added** `_app/src/lib/try-on/feedback/types.ts` — Yes/No + 6 reasons.
- **Unchanged**: `virtual-try-on-prompt.ts`, `google-ai.ts`, `orchestrator.ts`,
  `payload.ts`, `model-selection.ts`, `fashn.ts`, `replicate.ts`, `openai.ts`.

Nothing in the current production path was modified. The new tier system
is additive — once you're comfortable, switch the use-case layer to call
`runTier()` instead of `generateTryOn()` directly.

## Suggested implementation order

1. **Week 1.** Read the research doc and the tiers README. No code change.
2. **Week 1–2.** Wire the client-side quality gate with MediaPipe Tasks Web.
   The signals shape is already defined in `quality-gate/types.ts`. Have
   the client compute them on upload and POST them to the existing try-on
   endpoint. Server runs the gate via `evaluateCustomerPhoto` /
   `evaluateGarmentPhoto`. Rejected uploads never reach Gemini → instant
   cost savings.
3. **Week 2.** Add the feedback widget after generation result (Yes/No,
   then 6 reasons on No). Schema in `feedback/types.ts`. Create a Supabase
   table `try_on_feedback` with the columns described in research §9.2.
4. **Week 3.** Implement *one* acceptance check for real —
   `identitySimilarity` is the highest-ROI. Even logging it (without
   retrying) tells you the true face-fidelity rate of Gemini on your
   actual traffic.
5. **When budget arrives.** Implement `tier-a-premium.ts` `run()`.
   Step-by-step recipe is in the top comment of that file.

## What NOT to do

- Don't expose the word "AI" anywhere customer-facing. Always
  **"Provador Virtual"** (or "Virtual Try-On" in EN).
- Don't call `googleAiProvider.generate(...)` from new code. Always go
  through `runTier()` so routing is logged.
- Don't retrain a model. We're not training. The feedback loop is for
  prompt A/B and threshold tuning. The research doc is explicit about this.

## Questions / pings

If anything in this layout is confusing, the research doc is the source
of truth. Most ambiguities map to a specific section:

- Model choice → research §3 + §4
- Quality gate → research §5
- Customer-facing copy → research §6 + §7 + §8 + Appendix A
- Prompt structure → research §10 + §13
- Negative prompt → research §11
- Variables → research §12
- Acceptance criteria → research §14
- Implementation flow → research §15

Good luck. Ship Tier C confidently; lay the groundwork for Tier A.

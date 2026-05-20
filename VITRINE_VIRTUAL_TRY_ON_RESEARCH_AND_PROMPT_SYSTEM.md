# Vitrine Virtual — Virtual Try-On Research Report & Production Prompt System

> Deliverable date: 2026-05-19
> Audience: Vitrine Virtual development team, prompt-engineering team, product leadership
> Scope: Deep research, model comparison, model strategy, input validation, prompt system, rejection messaging, feedback loop, acceptance criteria, implementation notes
> Language constraint: All customer-facing copy uses "Virtual Try-On". The term "AI" is not exposed to customers.

---

## 1. Research Summary

Virtual Try-On (VTON) in 2026 has split into two practical camps:

1. **Specialized VTON APIs** — purpose-built models (FASHN, Kling Kolors, FitRoom, Pixelcut, OpenTryOn) trained on millions of garment+person pairs. They are very strong at garment fidelity (prints, logos, fabric drape), reasonably strong at body shape preservation, and have predictable per-image pricing. They are the safest baseline for an MVP.

2. **General-purpose multimodal image editors** — Gemini 2.5 Flash Image (a.k.a. "Nano Banana"), Gemini 3 Pro Image, GPT-Image-1, Flux Kontext. They excel at multi-image fusion, identity preservation, and prompt control, but they need careful prompting and a quality gate, because they can drift on garment-specific micro-details (small text, exact print position, fabric weight).

Key findings that drive Vitrine Virtual's architecture:

- **No single model wins on every axis.** FASHN v1.6 leads on garment fidelity (864×1296 output, prints/text/logos preserved). Gemini 2.5 Flash Image leads on identity preservation and editing flexibility. Kling Kolors is the cheapest credible production option. Open-source models (IDM-VTON, CatVTON, OOTDiffusion, Leffa) are technically excellent but **all carry CC-BY-NC licenses and are not legal for commercial Vitrine Virtual usage** without separate licensing.
- **Failure modes are remarkably consistent across models**: warped or extra fingers, duplicated limbs, melted faces, mismatched lighting, fabric "plastic" look, lost prints and small text, garment bleeding onto skin. Industry surveys cite ~72% of designers list anatomy distortion as the top frustration.
- **Input quality is the single biggest predictor of output quality.** A pre-generation quality gate (full-body visibility, sharpness via Laplacian variance, face detectability, pose usability) prevents the majority of bad outputs without any model change.
- **Two-pass architectures outperform single-pass** for premium output: (a) specialized VTON for garment fidelity, then (b) general multimodal model for background recomposition, lighting harmonization, and face refinement.
- **Prompt structure matters more than prompt length.** Hierarchical prompts that explicitly assign roles to each input image ("Image A: identity authority; Image B: garment authority") produce measurably better results in Gemini 2.5 Flash Image than long flat descriptions.
- **The economics are tractable.** FASHN $0.04–$0.075 per image, Kling $0.07, Gemini 2.5 Flash Image ~$0.039 per 1024² image. A two-pass premium path costs ~$0.10–$0.14 per generation, and a single-pass economy path can be under $0.05.

---

## 2. Source List

Primary documentation and benchmarks consulted:

- FASHN Virtual Try-On v1.6 API reference — endpoint contract, parameter enums, quality modes, content moderation: https://docs.fashn.ai/api-reference/tryon-v1-6
- FASHN v1.6 launch notes — 864×1296 resolution, training set scale, garment preservation claims: https://fashn.ai/blog/fashn-v1-6-our-best-virtual-try-on-model-yet-now-at-864-x-1296-resolution
- FASHN API pricing — on-demand and committed tiers: https://help.fashn.ai/plans-and-pricing/api-pricing
- FASHN developer guide on building a VTON app (commercial/licensing landscape and real-world pitfalls): https://fashn.ai/blog/so-you-want-to-build-a-virtual-try-on-app-a-developers-guide-to-not-getting
- FASHN comparison of top open-source VTON models — license traps and quality deltas: https://fashn.ai/blog/comparing-the-top-4-open-source-virtual-try-on-viton-models
- Gemini 2.5 Flash Image official model page — pricing, image-token math, capabilities: https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image
- Google Developers Blog on prompting Gemini 2.5 Flash Image for best results — hierarchical prompts, role assignment: https://developers.googleblog.com/en/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/
- Vertex AI on Gemini 2.5 Flash Image (Nano Banana) — multi-image fusion, character consistency: https://cloud.google.com/blog/products/ai-machine-learning/gemini-2-5-flash-image-on-vertex-ai
- fal.ai launch post for Gemini 2.5 Flash Image Edit — production hosting characteristics and latency: https://blog.fal.ai/introducing-gemini-2-5-flash-image-edit-aka-nano-banana/
- Vonage developer post showing a Gemini-powered VTON pipeline end-to-end (RCS): https://developer.vonage.com/en/blog/virtually-try-clothes-on-with-gemini-nano-banana-via-rcs
- Kling Kolors VTON pricing and capabilities (fal.ai and Pixazo): https://fal.ai/models/fal-ai/kling/v1-5/kolors-virtual-try-on and https://www.pixazo.ai/models/virtual-try-on/kolors-api
- IDM-VTON on Replicate — pricing and CC-BY-NC license confirmation: https://replicate.com/cuuupid/idm-vton
- "Rethinking Garment Conditioning in Diffusion-based Virtual Try-On" (arXiv 2511.18775) — survey of CatVTON, IDM-VTON, OOTDiffusion, Leffa architectures and trade-offs: https://arxiv.org/html/2511.18775
- "Image-Based Virtual Try-On: A Survey" (arXiv 2311.04811) — pipeline taxonomy: parsing, segmentation, warping, blending: https://arxiv.org/html/2311.04811v4
- Awesome-Try-On-Models repository — exhaustive list of academic and production VTON systems: https://github.com/Zheng-Chong/Awesome-Try-On-Models
- OpenTryOn GitHub (tryonlabs) — open-source orchestration patterns for VTON pipelines: https://github.com/tryonlabs/opentryon
- Nano Banana Pro face-consistency guide — explicit identity-preservation prompt patterns: https://blog.laozhang.ai/en/posts/nano-banana-pro-face-consistency-guide
- Leonardo.AI Nano Banana prompt guide — hierarchical prompt structure: https://leonardo.ai/news/nano-banana-prompt-guide
- Style3D analysis of anatomical failure modes in AI fashion imagery: https://www.style3d.ai/blog/fix-ai-anatomy-with-style-pose-no-more-mangled-hands-or-extra-limbs/
- Stable Diffusion Art catalogue of common AI image failures and prompt-side mitigations: https://stable-diffusion-art.com/common-problems-in-ai-images-and-how-to-fix-them/
- PyImageSearch on Laplacian-variance blur detection (input quality gating): https://pyimagesearch.com/2015/09/07/blur-detection-with-opencv/
- MediaPipe Pose documentation — 33-landmark whole-body pose for full-body detection: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
- Google "studio-quality digital try-on" announcement — production benchmark for premium VTON output: https://blog.google/products-and-platforms/products/shopping/studio-quality-digital-try-on/
- "Best AI Virtual Try-On Tools for Fashion Brands in 2026" — market scan: https://nightjar.so/blog/best-tools-ai-virtual-try-on
- TheAILearner — practical thresholds for Laplacian-variance sharpness: https://theailearner.com/2021/10/30/blur-detection-using-the-variance-of-the-laplacian-method/

Each source is included because it either (a) defines an API contract Vitrine Virtual must call against, (b) sets a benchmark for output quality, (c) describes a failure mode the system must guard against, or (d) documents a license restriction that filters our model shortlist.

---

## 3. Model Comparison

Scoring scale: 1 (weak) — 5 (excellent). "Commercial" means usable in a paid multi-tenant SaaS without separate licensing.

| Model / API | Realism | Face fidelity | Body shape | Garment fidelity | Pricing | Latency | API reliability | Commercial | Background control | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| **FASHN Tryon v1.6** | 4.5 | 4 | 4.5 | 5 | $0.04–$0.075/img | 5–17 s | 5 | Yes | Partial (preserves model image background) | 864×1296 output. Native garment-photo type detection. Built-in moderation. Best garment preservation in market. |
| **Kling Kolors VTON v1.5/2.1** | 4 | 3.5 | 4 | 4 | ~$0.07/img | ~7 s | 4 | Yes | Limited | Cheaper at scale. Reports of stiffness on structured outerwear. |
| **Gemini 2.5 Flash Image (Nano Banana)** | 4 | 4.5 | 4 | 3.5 (drifts on micro-details) | ~$0.039/1024² | 3–10 s | 5 | Yes | Excellent — prompt-controllable | Best multi-image fusion. Best identity preservation. Weakest at exact print/text placement. |
| **Gemini 3 Pro Image (when available)** | 4.5 | 5 | 4.5 | 4 | Higher (premium tier) | 8–20 s | 4 | Yes | Excellent | Premium fallback path for high-value catalogs. |
| **GPT-Image-1 / DALL·E** | 4 | 3.5 | 3.5 | 3 | $0.04–$0.17/img | 8–20 s | 4 | Yes | Good | Weaker for exact garment transfer. Strong for stylized background work. |
| **Flux Kontext (BFL)** | 4.5 | 4 | 4 | 4 | ~$0.04–$0.08/img | 4–10 s | 4 | Yes | Excellent | Strong general editor. Limited explicit VTON tuning. |
| **IDM-VTON (Replicate)** | 4 | 3.5 | 4 | 4.5 | ~$0.026/img | ~19 s | 4 | **No (CC-BY-NC)** | Limited | Excellent quality but non-commercial license blocks production use. |
| **CatVTON / OOTDiffusion / Leffa** | 4 | 3.5 | 4 | 4 | Self-host cost | Variable | 3 (self-host) | **No (CC-BY-NC)** | Limited | Same license blocker. Useful only for internal benchmarking. |
| **Pixelcut / FitRoom / Photoroom VTON** | 3.5–4 | 3.5 | 3.5 | 4 | $0.05–$0.10/img | 5–12 s | 4 | Yes | Limited | Viable secondary providers. |

Sources scored against: FASHN v1.6 docs and launch post, fal.ai Kling Kolors model card, Gemini 2.5 Flash Image official docs, Replicate IDM-VTON page, arXiv 2511.18775 quantitative comparison, FASHN open-source comparison post.

---

## 4. Recommended Model Strategy

**Headline recommendation: a tiered, two-pass pipeline.**

The system selects a path per request based on quality mode, garment value, and store preference.

### Tier A — Premium Path (default for new stores, recommended for the MVP)

1. **Stage 1 — Garment transfer with FASHN Tryon v1.6.**
   - `model_image` = validated customer photo
   - `garment_image` = uploaded garment photo (product flat-lay or on-model)
   - `category` = inferred or store-provided
   - `garment_photo_type` = `auto` (or explicitly `flat-lay` / `model`)
   - `mode` = `quality`
   - `moderation_level` = `conservative`
   - Output: garment correctly placed on the customer, body shape preserved, prints and small text retained.

2. **Stage 2 — Optional Gemini 2.5 Flash Image refinement.**
   - Used when `background_mode != "preserve_customer"` OR when the Stage 1 result has visible identity drift (we measure this with a small face-embedding similarity check between the customer photo and the Stage 1 result).
   - Prompt: re-anchor the face using the original customer photo, replace background per `background_mode`, harmonize lighting, do not change garment.
   - This is the "premium fashion polish" pass.

### Tier B — Economy Path

- Single-call **FASHN Tryon v1.6** in `balanced` mode. No refinement pass.
- Used when the store opts for lower cost, when the original customer background is preserved, and when face/identity similarity already passes threshold after Stage 1.

### Tier C — Identity-Critical Path

- Single-call **Gemini 2.5 Flash Image (Nano Banana)** with the multi-image-fusion prompt (Section 10).
- Used when the customer's face is unusually distinctive (children, dark skin tones, strong identity markers) and FASHN historically drifts more on this segment in our feedback data, OR when the customer explicitly opts in to "keep my original background".
- Trade-off: garment fidelity is slightly lower; identity fidelity is higher.

### Routing rules (executed by the orchestrator)

- Default: **Tier A**.
- `quality_mode = "fast"` and `background_mode = "preserve_customer"` → **Tier B**.
- Detected identity drift in Stage 1 > threshold, or `background_mode = "preserve_customer"` with cluttered background → **Tier C**.
- Store-pinned model via `store_model_preference` overrides the router.

### Why this beats "just Nano Banana"

- Nano Banana on its own loses small prints and exact pattern alignment more often than FASHN.
- FASHN on its own has weaker background control and slightly weaker face fidelity than Gemini.
- The two-pass approach uses each model where it is strongest and is still under $0.14 per generation.

### Why we avoid IDM-VTON / CatVTON / OOTDiffusion / Leffa in production

- They are technically excellent but ship under CC-BY-NC. Vitrine Virtual is a paid multi-tenant SaaS, which the license forbids. We keep them only as an internal evaluation baseline.

---

## 5. Input Validation Strategy (Pre-Generation Quality Gate)

The quality gate runs entirely client-side or on a thin server function, before any paid generation call. It returns one of three verdicts: `proceed`, `proceed_with_warning`, `reject`.

### 5.1 Customer photo checks

| Check | Method | Pass threshold | Verdict if fail |
|---|---|---|---|
| File integrity | MIME + decode | Decodes to RGB ≥ 512px on shortest side | reject |
| Sharpness | Laplacian variance on grayscale | ≥ 100 on a normalized 1024px image | proceed_with_warning if 60–100, reject if < 60 |
| Brightness | Mean luminance | 40–220 on 0–255 scale | proceed_with_warning if outside, reject if < 25 or > 240 |
| Person presence | MediaPipe Pose / YOLO person class | ≥ 1 person, confidence ≥ 0.7 | reject |
| Person count | Same | Exactly 1 dominant person | reject if 0 or > 1 covering > 15% of frame |
| Full-body visibility | MediaPipe Pose 33 landmarks | All of: nose, shoulders, hips, knees, ankles detected, confidence ≥ 0.5 | downgrade to category-limited (see 5.3) |
| Face visibility | Face detector (MediaPipe Face / RetinaFace) | Face bbox ≥ 8% of image area, both eyes visible | proceed_with_warning if face < 8% but pose OK, reject if no face at all and identity is required |
| Pose usability | MediaPipe Pose | Torso roughly upright; arms not fully crossed over torso for tops; legs not fully crossed for bottoms | proceed_with_warning |
| Occlusion of target region | Garment-category-aware mask check | Target body region (torso/legs/full body) ≥ 70% unoccluded | reject if < 50% |
| Background clutter | Edge density in non-person regions | Informational only | always proceed (handled by background_mode) |

### 5.2 Garment photo checks

| Check | Method | Pass threshold | Verdict if fail |
|---|---|---|---|
| File integrity | MIME + decode | RGB ≥ 512px shortest side | reject |
| Garment detectability | Object detection (clothing classes) | Confidence ≥ 0.6 OR store provides category | reject |
| Garment occlusion | Mask coverage | Garment occupies ≥ 25% of image | proceed_with_warning if smaller |
| Photo type inference | Heuristic + classifier | Either `flat-lay` or `model` confidently detected | default to `auto` |
| Text/logo presence | OCR (lightweight) | Informational | feeds the prompt: "preserve all printed text exactly" |

### 5.3 Routing decisions from the gate

- **proceed** → run the recommended tier.
- **proceed_with_warning** → run generation but show the customer a short banner ("This photo is okay. A better photo will give a better result."), and tag the generation in the feedback store so we can measure quality impact.
- **proceed (category-limited)** → only generate the garment categories supported by the visible body region. Example: selfie with no legs visible → allow tops/one-pieces only if upper body fully visible, never bottoms.
- **reject** → show the friendly message from Section 7 and do not spend any model credits.

### 5.4 Where checks run

- Sharpness, brightness, decode, person presence and pose: **client-side WebAssembly** (MediaPipe Tasks Web). Zero server cost, instant feedback.
- Face embedding for post-generation identity similarity: **server-side**, after Stage 1, using a small ArcFace-style model.
- All gate outcomes are logged for the feedback loop (Section 9).

---

## 6. Customer Photo Instructions (Customer-Facing)

Shown on the upload screen, before the customer picks an image. Three short blocks, no jargon, no mention of "AI".

**Title:** Get the best Virtual Try-On

**Body:**

> For the most realistic result, please upload one full-body photo of yourself.
>
> What works best:
> - Stand straight, facing the camera, with your arms relaxed at your sides.
> - Make sure your whole body is in the frame, from head to feet.
> - Use natural, even light. Avoid strong shadows and very bright spots.
> - Wear fitted clothing if possible, so your body shape is clear.
> - Choose a plain wall or simple background.
>
> What to avoid:
> - Photos where part of your body is cut off.
> - Mirror selfies with reflections or strong glare.
> - Blurry or very dark photos.
> - Photos with other people in the frame.

**CTA:** Upload your photo

A short illustrated guide with three reference silhouettes (full-body, ¾, selfie) labeled "Best", "Okay", "Not enough" should accompany the text.

---

## 7. Rejection Messages (Customer-Facing)

Friendly, specific, never blames the customer, always offers a path forward. No mention of "AI", "model", or technical errors.

| Trigger | Message |
|---|---|
| No person detected | "We couldn't find a clear photo of you in this image. Please upload a photo where you are visible." |
| Multiple people detected | "Your photo shows more than one person. Please upload a photo where you are the only person in the frame." |
| Image too blurry | "This photo looks a little blurry. Please upload a sharper photo so we can show the best Virtual Try-On result." |
| Too dark or too bright | "The lighting in this photo makes it hard to show an accurate Virtual Try-On. Please upload a photo with more even light." |
| Body partially hidden | "We can only see part of your body in this photo. Please upload a full-body photo from head to feet." |
| Selfie only, bottom-garment requested | "To try on this item, we need to see your full body. Please upload a photo that includes your legs as well." |
| Selfie only, top-garment requested, face too cropped | "Please upload a photo that shows your face and your upper body, so we can show the best result." |
| Face not visible at all | "We need to see your face so we can keep your look in the Virtual Try-On. Please upload a photo where your face is visible." |
| Resolution too low | "This photo is a bit small. Please upload a larger or sharper photo for the best result." |
| Strong occlusion in target region | "Something is covering the area where the garment would be shown. Please upload a photo where this area is clearly visible." |
| Garment photo unclear | "We couldn't read this garment photo clearly. Please make sure the item is shown fully and centered." |
| Pose mismatch (e.g., sitting for a dress) | "Please upload a standing photo so the item drapes correctly in the Virtual Try-On." |
| Quality gate uncertain | "We're not sure we can show this photo at the quality we expect. Want to try a different photo, or continue anyway?" (offers explicit opt-in) |

Each message ships with a single primary action ("Upload a new photo") and, where useful, a secondary action ("See photo tips").

---

## 8. Background Strategy

Three background modes, controlled by `background_mode` (default: `white`). The store sets a default; the customer can override per session.

### 8.1 `white` (default)

- Pure, neutral studio white (#FFFFFF), soft and even, with a barely visible floor shadow under the customer's feet for grounding.
- Implemented by instructing the model to "place the subject on a seamless pure white studio background, softbox lighting from front-left, soft contact shadow at floor".
- After generation, an optional alpha-cleanup pass (rembg or Gemini background-removal prompt) ensures the background is truly clean and uniform.
- This is the safest mode for catalog consistency and is what we recommend as Vitrine Virtual's default brand look.

### 8.2 `store_background`

- The store provides either:
  - a **reference image** of their preferred environment (branded fitting room, premium studio, lifestyle scene), or
  - a **text description** in `store_background_description` (e.g., "minimalist concrete photography studio, warm tungsten lighting, soft shadow on the floor, no props").
- Stage 2 (Gemini 2.5 Flash Image) composites the customer onto this environment, with explicit lighting-harmonization instructions: "match the direction and color temperature of the lighting in the reference background; rebuild the shadow so it falls in the same direction".
- If a reference image is provided, role-assign it: "Image C: background authority, do not import any people, props, or furniture from Image C beyond environment cues".

### 8.3 `preserve_customer` (customer's original background)

- Only used when:
  - The customer explicitly opted in, AND
  - The background-clutter check in the quality gate scored low-to-medium (high clutter risks generation drift), AND
  - There is no strong color cast that would conflict with garment color.
- The pipeline preserves the original background pixels via inpainting: only the body region is regenerated; the rest is composited back from the original.
- Implementation: produce a body-segmentation mask before generation; after Stage 1, blend Stage 1 output inside the mask with the original background outside the mask, then run a short Stage 2 pass only to fix the seam and harmonize shadow.
- Customer message if we have to fall back: "We softened your original background slightly to keep the photo looking natural."

### 8.4 Background rules summary

- White is always available.
- Store background is available when the store has uploaded a reference or written a description.
- Customer-original is available only when the quality gate allows it.
- The chosen `background_mode` is logged for the feedback loop.

---

## 9. Feedback Loop Design

Minimal, optional, non-intrusive. Two questions maximum.

### 9.1 The flow

1. After the generated image is shown, a small inline question appears below it, after a 2-second delay (so the customer has time to look at the result first):
   > **Did you like the result?**
   > [👍 Yes] [👎 No] [Skip]
2. If the customer clicks **Yes** → store `{rating: positive}` and end. Optionally show a "Share" or "Save" action.
3. If the customer clicks **No** → reveal one follow-up question:
   > **What was the main problem?**
   > - The face didn't look like me
   > - My body shape looked different
   > - The clothing looked wrong
   > - The image didn't look realistic
   > - The background looked bad
   > - Other
   > [Skip]
4. If the customer picks **Other** → small free-text field (optional).
5. **Skip** is always available and equally weighted. No dark patterns.

### 9.2 What we record per generation

```
generation_id, store_id, garment_id, garment_category, tier_used,
model_chain, prompt_variant_id, background_mode,
quality_gate_verdict, quality_gate_signals,
identity_similarity_score, latency_ms, cost_usd,
feedback_rating, feedback_reason, free_text
```

### 9.3 How the data improves the system (and what it does *not* do)

The feedback loop **does not retrain any model**. Vitrine Virtual does not own or fine-tune the underlying generation models. Instead, the data is used in four concrete ways:

1. **Prompt optimization.** Each prompt is tagged with a `prompt_variant_id`. We A/B test prompt variants per garment category and per failure reason. Variants that win on the negative-feedback ratio for that reason are promoted to default. This is straightforward offline prompt optimization, not model training.
2. **Model selection.** If `face_didnt_look_like_me` is disproportionately high on a given store's traffic, the router shifts that store's default toward Tier C (Gemini-led identity path). If `clothing_looked_wrong` is high, the router shifts toward Tier A (FASHN-led garment path).
3. **Rejection-rule tuning.** Quality-gate signals are correlated with feedback. If photos that passed `proceed_with_warning` consistently get negative feedback, we tighten that signal's threshold.
4. **Evaluation dataset.** Negatively rated generations (with customer consent and with PII handling) form an internal benchmark set. New prompt variants and model versions are evaluated against this benchmark before rollout. This is **quality monitoring**, not model retraining.

### 9.4 Dashboards (internal)

- Per-store rolling 30-day positive-feedback rate.
- Per-garment-category negative-reason histogram.
- Per-tier cost vs. positive-feedback rate.
- Quality-gate verdict breakdown vs. feedback outcome.

---

## 10. Final Production Prompt (Master)

This is the master prompt template for Stage 1 when a general multimodal model is used (Tier C, and Stage 2 of Tier A). When FASHN is the Stage 1 model, the variables below are passed as structured API parameters instead of natural language — but the same constraints are reflected in `quality_mode = "quality"` and `garment_photo_type` selection.

### 10.1 System role (set once per call)

```
You are a premium fashion try-on visualization engine for Vitrine Virtual,
a virtual storefront. Your single task is to render a photorealistic image
of the exact same person from the customer photo, wearing the exact garment
from the garment photo, with no other changes to the person. You will be
penalized for any change to the person's identity, body shape, height,
weight, age, or skin tone. You will be penalized for any change to the
garment's color, fabric, print, pattern, cut, length, or fit. Output a
single, high-quality, photorealistic fashion image. Do not output cartoons,
illustrations, mannequins, collages, or stylized art.
```

### 10.2 User prompt (Master template)

```
TASK
Generate one photorealistic fashion photograph of the person in {{customer_image}}
wearing the garment in {{garment_image}}.

INPUT ROLES
- Image A ({{customer_image}}): IDENTITY AND BODY AUTHORITY.
  Preserve face exactly: eye shape, nose bridge, jawline, lip shape, skin tone,
  freckles, eyebrows, hairstyle, hair color, ears, and any distinctive features.
  Preserve body exactly: height, weight, body proportions, shoulder width,
  waist, hips, leg length, arm length, hand size, posture.
  Preserve age and ethnicity exactly.
- Image B ({{garment_image}}): GARMENT AUTHORITY.
  This is a {{garment_category}}. {{garment_description}}.
  Preserve the garment exactly: color (do not shift hue or saturation),
  fabric texture, weight, all prints, all text, all logos, all patterns,
  pattern alignment and scale, cut, length, neckline, sleeve length, hem,
  closures, buttons, zippers, seams, stitching, and any decorative details.
  If the garment image shows the item on another person or mannequin, transfer
  only the garment; do not transfer the other person's face, body, pose, or
  accessories.
{{#if store_background_reference}}
- Image C ({{store_background_reference}}): BACKGROUND AUTHORITY.
  Use only the environment, lighting, and floor of Image C. Do not import
  any people, props, furniture, text, or logos from Image C.
{{/if}}

OUTPUT REQUIREMENTS
- One photorealistic fashion photograph, magazine-editorial quality.
- The person from Image A, in a natural standing pose, wearing the garment
  from Image B, fitted naturally with realistic fabric drape, folds, and
  shadows that match the body underneath.
- {{background_instruction}}
- Lighting: soft, even, daylight-balanced, with a soft contact shadow at the
  feet for grounding. Lighting on the person and the garment must match the
  lighting of the background.
- Camera: full-body framing, head to feet, eye-level, 50mm-equivalent lens
  look, slight depth of field, sharp focus on the person.
- Aspect ratio: 3:4 vertical.
- Color: true-to-source garment color. Skin tone identical to Image A.
- Resolution: highest available.

HARD CONSTRAINTS
- Do not slim, enlarge, lengthen, shorten, age, de-age, or otherwise alter
  the person's body or face.
- Do not add accessories, jewelry, glasses, hats, scarves, bags, or makeup
  that are not in Image A or Image B.
- Do not duplicate limbs, fingers, or facial features.
- Do not produce extra people, reflections, or copies of the subject.
- Do not blur, smudge, or stylize the face. The face must remain photographic.
- Do not change the garment's color, print, or text.
- Do not transfer the previous wearer's body or face from Image B.
- If the garment is a top, do not change the bottoms in Image A unless
  required for visual continuity, and never change underwear visibility.
- If the garment is a bottom, do not change the top in Image A.
- If the garment is a one-piece, replace both top and bottom with the garment.

QUALITY MODE
{{quality_mode_instruction}}

OUTPUT STYLE
{{output_style_instruction}}
```

### 10.3 Resolved `background_instruction` per `background_mode`

- `white` → "Place the subject on a seamless pure white studio background (#FFFFFF), softbox lighting from front-left, with a subtle soft contact shadow at the feet. No props. No floor pattern."
- `store_background` (with reference image C) → "Place the subject in the environment shown in Image C. Match the direction, color temperature, and softness of Image C's lighting. Rebuild the floor shadow so it falls in the same direction as the shadows in Image C."
- `store_background` (text only) → "Place the subject in this environment: {{store_background_description}}. Match the lighting and floor shadow to that environment."
- `preserve_customer` → "Keep the original background from Image A unchanged outside the person's silhouette. Inside the silhouette, render the person with the new garment. Harmonize shadows and lighting at the silhouette edge so the composite is seamless."

### 10.4 Resolved `quality_mode_instruction`

- `fast` → "Prioritize a clean, plausible result in the shortest time. Acceptable to slightly soften micro-details."
- `balanced` (default) → "Balance speed and quality. Preserve garment micro-details and identity above all else."
- `quality` → "Prioritize maximum realism, fabric texture fidelity, and identity preservation, even if generation takes longer. Render fine details: stitching, fabric weave, individual hairs at the hairline, eye catchlights."

### 10.5 Resolved `output_style_instruction`

- `premium_studio` (default) → "Magazine-editorial fashion photography, clean and minimal, slight film-grain feel."
- `lifestyle` → "Natural lifestyle fashion photography, candid feel, still photorealistic."
- `lookbook` → "Modern lookbook photography, even soft lighting, neutral mood."

---

## 11. Final Negative Prompt

The negative prompt is appended to every Stage 1 and Stage 2 call to general multimodal models. FASHN does not consume a free-form negative prompt; the equivalent constraints are encoded in its strict parameters and content moderation.

```
NEGATIVE — the model must NOT produce any of the following:
cartoon, illustration, anime, 3D render, mannequin, plastic-looking skin,
doll-like face, painting, sketch, drawing, watercolor, oil painting,
artistic stylization, collage, photo-collage seam, cut-out look,
mismatched lighting, mismatched shadow direction, double shadow, no shadow,
warped face, distorted face, melted face, smudged face, blurred face,
asymmetric eyes (when source is symmetric), wrong eye color, wrong skin tone,
wrong age, younger version of subject, older version of subject,
slimmer body, larger body, taller subject, shorter subject, hourglass exaggeration,
duplicated person, twin, mirrored second subject, reflection of subject,
extra arm, extra leg, extra hand, missing arm, missing leg, missing hand,
extra finger, missing finger, fused fingers, claw hand, melted hand,
extra head, missing head,
wrong garment color, color shift, hue shift, saturation shift,
missing print, missing logo, missing text, garbled text, fake text,
distorted pattern, broken pattern alignment, stretched print, pixelated print,
plastic fabric, latex sheen on non-latex fabric, wet-look on dry fabric,
wrong garment length, wrong sleeve length, wrong neckline,
garment bleed into skin, skin showing through opaque fabric,
extra garments not in the input (jackets, scarves, hats, jewelry,
glasses, bags, watches, belts) unless present in Image A or Image B,
text artifacts, watermark, signature, brand overlay, UI elements,
camera HUD, frame, border, vignette,
NSFW content, nudity, underwear visible through clothing,
other people in the frame, faces in the background,
heavy bokeh that hides the garment, motion blur,
oversaturated colors, HDR halos, posterization, banding,
JPEG artifacts, compression artifacts, low resolution, upscaling artifacts,
chromatic aberration, lens flare obscuring the garment.
```

---

## 12. Prompt Variables

All variables are injected by the orchestrator. Required vs. optional is marked.

| Variable | Required | Type | Description |
|---|---|---|---|
| `customer_image` | required | image URL or bytes | Validated customer photo (post quality gate). |
| `garment_image` | required | image URL or bytes | Garment photo (flat-lay or on-model). |
| `garment_category` | required | enum: `tops`, `bottoms`, `one-pieces`, `outerwear`, `swimwear`, `accessories`, `auto` | Drives prompt constraints and routing. |
| `garment_description` | optional | string | Short structured description: "Black cotton crewneck T-shirt with white 'VITRINE' text printed across the chest, regular fit, short sleeves." Used by Stage 2 and as fallback when Stage 1 misreads details. |
| `background_mode` | required | enum: `white`, `store_background`, `preserve_customer` | Default `white`. |
| `store_background_description` | optional | string | Used if `background_mode = store_background` and no reference image. |
| `store_background_reference` | optional | image URL | Used if `background_mode = store_background` and a reference image exists. |
| `preserve_customer_background` | derived | boolean | True iff `background_mode = preserve_customer`. |
| `quality_mode` | required | enum: `fast`, `balanced`, `quality` | Default `balanced`. |
| `output_style` | required | enum: `premium_studio`, `lifestyle`, `lookbook` | Default `premium_studio`. |
| `user_feedback_history` | optional | object | Last-N feedback signals for this user — used by the router, not exposed in the prompt text. |
| `store_model_preference` | optional | enum: `auto`, `tier_a`, `tier_b`, `tier_c` | Hard override of the router. Default `auto`. |
| `customer_photo_type` | derived | enum: `full_body`, `three_quarter`, `mirror`, `selfie`, `partial` | Filled by quality gate; selects the prompt variant in Section 13. |
| `garment_photo_type` | derived | enum: `flat-lay`, `model`, `auto` | Filled by garment classifier. |
| `aspect_ratio` | derived | string | `3:4` for full-body, `1:1` for selfies on top-only garments, `4:5` for three-quarter. |
| `prompt_variant_id` | system | string | Versioned for the feedback loop. |
| `seed` | optional | int | Fixed seed for reproducibility on retries. |
| `safety_level` | required | enum: `conservative`, `permissive` | Default `conservative`. Maps to FASHN `moderation_level`. |

---

## 13. Prompt Variants

Each variant is a delta on the master prompt in Section 10. Multiple variants can apply at once (e.g., "garment-on-other-person" + "mirror-photo" + "store-background"). The orchestrator concatenates the deltas after the master prompt body.

### 13.1 Garment input: clean product photo (flat-lay)

```
GARMENT INPUT NOTE
Image B is a flat-lay or ghost-mannequin product photo. There is no other
person in Image B. Reconstruct realistic three-dimensional drape on the
customer's body, including natural folds at the shoulders, chest, waist,
and (if applicable) hips and knees.
```

### 13.2 Garment input: worn by another person

```
GARMENT INPUT NOTE
Image B shows the garment worn by another person or model. Transfer only
the garment. Do not transfer the other person's face, body, pose, hairstyle,
skin tone, makeup, accessories, jewelry, shoes, or background. The garment
must be re-fitted to the body and pose of the person in Image A.
```

### 13.3 Customer input: full-body photo

```
CUSTOMER INPUT NOTE
Image A is a full-body photo. Use the existing pose if natural, or restage
to a neutral standing pose facing the camera if the pose obscures the
garment area.
```

### 13.4 Customer input: mirror photo

```
CUSTOMER INPUT NOTE
Image A is a mirror photo. Remove any phone, hand-on-phone gesture, or
visible camera. Do not flip text on the garment in Image B. Re-stage the
customer to face the camera directly in a neutral standing pose, while
keeping the face, body, and hairstyle from Image A.
```

### 13.5 Customer input: partial body / cropped

```
CUSTOMER INPUT NOTE
Image A shows only part of the body (head and torso, or head and upper body).
You may extend the body downward to render the garment, but you must
preserve the visible portion of Image A exactly — face, hair, neck, shoulders,
and skin tone. Extended limbs and lower body must be plausible and
consistent with the visible portion (same body type, same skin tone).
This variant is only allowed for tops and outerwear; reject for bottoms
and one-pieces.
```

### 13.6 Customer input: selfie only

```
CUSTOMER INPUT NOTE
Image A is a head-and-shoulders selfie. Treat the face, hair, neck, and
collar area as identity-locked source. Render the rest of the body as a
plausible extension, in proportion to the visible head and shoulders.
This variant is only allowed for tops and accessories. Use a neutral
standing pose. If the garment category is bottoms or one-pieces, do not
generate; defer to the rejection message.
```

### 13.7 Background: white (default)

```
BACKGROUND NOTE
Seamless pure white studio background (#FFFFFF). Softbox lighting from
front-left. A subtle soft contact shadow at the feet, no harsh shadows
elsewhere. No floor pattern, no props, no text.
```

### 13.8 Background: store-defined

```
BACKGROUND NOTE
Place the subject in the environment described / shown by the store.
{{store_background_description_or_reference}}
Match the direction, color temperature, and softness of the store
environment's lighting. Rebuild the floor shadow accordingly.
Do not import any people, props, or text from any reference image.
```

### 13.9 Background: customer original

```
BACKGROUND NOTE
Preserve the original background from Image A outside the person's
silhouette. Inside the silhouette, render the person wearing the garment.
At the silhouette edge, harmonize lighting direction and color so that the
composite is seamless and there is no visible cut-out edge.
```

### 13.10 Combination notes

- Selfie-only (13.6) + bottoms or one-piece → blocked by gate, rejection message from Section 7.
- Mirror photo (13.4) + customer-original background (13.9) → allowed, but flag a `proceed_with_warning` because mirror photos often contain reflections and glare that survive into the composite.
- Garment-on-other-person (13.2) + customer-original background (13.9) → allowed, with extra emphasis on the "do not transfer pose or accessories" line.

---

## 14. Acceptance Criteria

A generated image must satisfy *all* of the following before it is shown to the customer. These checks run server-side on the generation result.

1. **Identity similarity.** Cosine similarity between a face embedding of `customer_image` and a face embedding of the generated image ≥ 0.55 (ArcFace-style, normalized). If below, retry with Stage 2 face-anchor pass; if still below after one retry, fall back to Tier C; if still below, return a soft error: "We couldn't show this Virtual Try-On at our quality standard. Please try a different photo or a different item."
2. **Single subject.** Exactly one person detected in the output. Person count > 1 → discard and retry.
3. **Anatomy sanity.** Hand-keypoint and limb-count check (MediaPipe Hands + Pose): no extra hands, no extra arms, no missing arms. Threshold: 2 hands ± 1 when hands are occluded by garment.
4. **Garment color fidelity.** Mean Lab color of the central garment patch in the output is within ΔE2000 ≤ 8 of the central garment patch in `garment_image`. If above, retry once with stronger color-preservation phrasing.
5. **Garment text fidelity.** When OCR on `garment_image` returns text, OCR on the output must return the same text (case-insensitive, edit distance ≤ 1) inside the garment region. If not, retry once; if still failing on Tier A, fall back to FASHN-only result without Stage 2.
6. **Resolution.** Output image is at least 768 px on the shortest side; 864×1296 is the target. Smaller outputs are upscaled with a fast model-preserving upscaler before delivery.
7. **No NSFW.** Built-in safety classifier passes.
8. **No watermark or text artifacts** outside the garment region. Quick OCR pass on the background area returns empty.
9. **Aspect ratio matches** the variant in Section 13.
10. **Background matches the requested mode** (white reflectance check for `white`, color-histogram similarity for `store_background` reference, mask-edge continuity for `preserve_customer`).

If criteria 1–5 fail twice, the generation is suppressed and the customer sees the soft-error message above. Cost and outcome are logged for the feedback loop.

---

## 15. Implementation Notes for Developers

### 15.1 High-level flow

```
[ Customer uploads photo ] -> [ Quality gate (client-side, MediaPipe Web) ]
   |--> reject -> friendly message
   |--> proceed_with_warning -> banner + continue
   |--> proceed -> orchestrator

[ Orchestrator ]
   |--> Choose tier (default Tier A)
   |--> Build variables (Section 12) + variants (Section 13)
   |--> Call Stage 1 (FASHN Tryon v1.6 for Tier A/B, Gemini 2.5 Flash Image for Tier C)
   |--> Stage 1 acceptance check (identity similarity, garment ΔE, text OCR, anatomy)
   |    |--> if failed: one retry with adjusted prompt or fallback tier
   |--> Stage 2 (Gemini 2.5 Flash Image): background + lighting + face anchor, if Tier A
   |--> Final acceptance check (Section 14)
   |--> Deliver to customer

[ Feedback widget ] -> [ Feedback store ] -> [ Prompt A/B + router updates ]
```

### 15.2 Key services

- **Quality gate service** — TypeScript + MediaPipe Tasks Web in the browser; same algorithms reimplemented server-side as a guard.
- **Orchestrator** — single stateless service. Decides tier, fills the prompt template, calls providers.
- **Provider adapters** — FASHN, Gemini (Vertex AI or AI Studio), Kling (via fal.ai), Flux Kontext. Each adapter normalizes inputs/outputs to a common contract.
- **Acceptance checker** — face-embedding model (small, on-CPU), color sampler, OCR (lightweight), pose + hand keypoints.
- **Feedback service** — append-only event store + nightly aggregator + admin dashboard.

### 15.3 Cost guards

- Hard per-store monthly cap. Configurable.
- Per-session retry cap of 2 generations to prevent cost runaway.
- Gate-rejected uploads never trigger paid calls.
- Cache by `(hash(customer_image), hash(garment_image), background_mode, quality_mode)` — exact-repeat requests return the same result.

### 15.4 Privacy and compliance

- Customer photos are processed in-memory only by default. Storage is opt-in.
- Garment photos may be cached per store (they are commercial assets).
- Feedback free-text fields are screened for PII before they reach the analytics store.
- All providers used must permit commercial use of outputs (FASHN, Gemini via Google's commercial terms, Kling via fal.ai commercial terms, Flux via BFL commercial terms). IDM-VTON, CatVTON, OOTDiffusion, Leffa are **not** to be called from production.

### 15.5 Observability

Log per generation:
- `prompt_variant_id`, tier, models used, latency per stage, cost per stage, acceptance-check pass/fail per criterion, feedback outcome.

### 15.6 Rollout suggestion

- **Phase 1 (MVP).** Tier A (FASHN v1.6 only, single pass), white background only, quality gate live, feedback widget live. Goal: validate baseline conversion and quality.
- **Phase 2.** Add Stage 2 Gemini polish for premium output and store backgrounds.
- **Phase 3.** Add Tier C (Gemini-led) for identity-sensitive segments. Add `preserve_customer` background.
- **Phase 4.** Per-store router learned from feedback data; prompt-variant A/B at scale.

### 15.7 Non-goals (explicit)

- We do not retrain any image-generation model. Improvements come from prompts, routing, and gating.
- We do not promise pixel-perfect garment reconstruction on hand-drawn or stylized garment photos.
- We do not generate generic body templates ("ideal" bodies). We always preserve the customer's body shape.

---

## Appendix A — Customer-facing copy register

- Use **"Virtual Try-On"** everywhere customer-facing.
- Never say "AI", "model", "render", "generate", "neural", "diffusion", "synthetic".
- Use **"show"**, **"preview"**, **"try on"**, **"see"** instead.
- Replace error language: "We couldn't show this Virtual Try-On" rather than "Generation failed".

## Appendix B — Quick start: FASHN Tryon v1.6 call (Tier A Stage 1)

```http
POST https://api.fashn.ai/v1/run
Authorization: Bearer <FASHN_API_KEY>
Content-Type: application/json

{
  "model_name": "tryon-v1.6",
  "inputs": {
    "model_image": "<customer_image_url>",
    "garment_image": "<garment_image_url>",
    "category": "{{garment_category}}",
    "garment_photo_type": "auto",
    "mode": "quality",
    "moderation_level": "conservative",
    "num_samples": 1,
    "output_format": "png",
    "seed": {{seed}}
  }
}
```

Poll the prediction endpoint until `status = completed`, then run the acceptance checks in Section 14.

## Appendix C — Quick start: Gemini 2.5 Flash Image call (Tier C / Stage 2)

Provide `customer_image` (Image A), `garment_image` (Image B), optionally `store_background_reference` (Image C), and the resolved prompt from Section 10 with the right variant deltas from Section 13. Set `safety_settings` to block harmful and explicit content. Set the temperature low (≤ 0.4) for fidelity.

---

End of document.

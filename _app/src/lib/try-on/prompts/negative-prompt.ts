/**
 * Negative prompt — research deliverable section 11.
 *
 * Gemini 2.5 Flash Image does not accept a separate "negative" field, but it
 * does respect explicit "do not produce" lists when appended to the main
 * prompt. We expose this as a stable constant so it can be A/B-tested
 * independently of the main prompt body.
 *
 * Keep this list short enough to fit in the prompt budget — if it grows,
 * trim the rarely-triggered items first (e.g. specific compression artifacts).
 */
export const VIRTUAL_TRYON_NEGATIVE_PROMPT = `NEGATIVE — the model must NOT produce any of the following:
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
glasses, bags, watches, belts) unless present in the customer photo
or the garment photo,
text artifacts, watermark, signature, brand overlay, UI elements,
camera HUD, frame, border, vignette,
NSFW content, nudity, underwear visible through clothing,
other people in the frame, faces in the background,
heavy bokeh that hides the garment, motion blur,
oversaturated colors, HDR halos, posterization, banding,
JPEG artifacts, compression artifacts, low resolution, upscaling artifacts,
chromatic aberration, lens flare obscuring the garment.`

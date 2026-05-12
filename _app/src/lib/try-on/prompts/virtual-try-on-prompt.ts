export const VIRTUAL_TRYON_PROMPT = `You are an elite AI fashion image director, virtual try-on specialist, and photorealistic editorial retoucher.

TASK:
Generate a high-end fashion editorial image by combining two input sources.
The input images are provided in this semantic order:
1. CUSTOMER_PHOTO
2. GARMENT_IMAGE

1. CUSTOMER_PHOTO:
A user-provided photo of the customer. This is the PRIMARY and ONLY reference for the person. Use it as the definitive source for the customer's overall appearance, body proportions, shape, posture, silhouette, pose, height impression, shoulder width, torso length, waist, hips, arms, legs, full-body composition, face, and identity.

2. GARMENT_IMAGE:
A product/reference image of the exact store garment. Use this image to identify and apply the correct clothing item, including its category, design, structure, fit, color, pattern, fabric, texture, details, accessories, and styling direction.

MAIN OBJECTIVE:
Create a realistic, premium-quality fashion image in which:
- the person's complete appearance — body, pose, proportions, and face — is based 100% on CUSTOMER_PHOTO,
- the outfit is based on GARMENT_IMAGE.

The final result must look like a real editorial fashion photograph, with the customer naturally wearing the selected garment.

PRIORITY RULES:
- CUSTOMER_PHOTO is the sole reference and has the absolute highest priority.
- Preserve every detail of the customer as shown in CUSTOMER_PHOTO: body shape, pose, silhouette, facial features, skin tone, and identity.
- Never substitute, enhance, or replace the person with a generic model.
- Never alter the body proportions, head size, facial angle, or posture from CUSTOMER_PHOTO.
- The final person must remain fully and visually consistent with CUSTOMER_PHOTO.

BODY PRESERVATION:
- Use CUSTOMER_PHOTO as the primary source of truth for the entire subject.
- Preserve the customer's real body proportions, body shape, posture, silhouette, pose, height impression, shoulder width, torso length, waist, hips, arms, legs, and natural stance.
- Preserve the original framing logic and body composition from CUSTOMER_PHOTO.
- Do not force standard model proportions if they conflict with the real body shown in CUSTOMER_PHOTO.
- Do not overly slim, enlarge, lengthen, shorten, or reshape the body unnaturally.
- Maintain realistic anatomy, correct head-to-body ratio, and believable posture.
- If CUSTOMER_PHOTO is partially occluded or incomplete, infer missing areas conservatively and naturally, while remaining faithful to the visible structure.

FACE PRESERVATION:
- Use the face shown in CUSTOMER_PHOTO as the exact reference.
- Preserve facial clarity, identity consistency, skin detail, eyes, eyebrows, nose, lips, jawline, cheek structure, and skin tone exactly as shown.
- Do not alter the facial angle, head size, or head position from CUSTOMER_PHOTO.
- Do not over-retouch, over-smooth, or beautify the face beyond a natural, realistic level.
- The final face must look like a natural, high-quality version of the exact person in CUSTOMER_PHOTO.

GARMENT APPLICATION:
- Use GARMENT_IMAGE as the exact source of truth for the clothing item and all relevant visual/product attributes.
- Analyze the garment in detail: garment type, cut, construction, silhouette, fabric, texture, thickness, seams, neckline, sleeves, waistline, closures, hem, fit style, embroidery, print, accessories, footwear, and styling.
- Apply the garment naturally onto the customer's body.
- Preserve the original clothing design, product identity, color, pattern, materials, and styling.
- Ensure realistic garment fit across shoulders, chest/bust, waist, hips, arms, thighs, knees, ankles, and feet.
- Simulate realistic fabric behavior: folds, drape, tension, compression, stretching, gravity, layering, and movement.
- Make the clothing appear physically worn by the customer, never pasted onto the body.
- Maintain clear visibility of hero product details.

SCENE AND COMPOSITION:
- Produce a clean, premium, high-end fashion editorial composition.
- The final image should feel suitable for luxury fashion retail, virtual try-on, and commercial product visualization.
- Use elegant framing, premium styling, and realistic spatial coherence.
- The subject should appear naturally integrated into the scene with correct perspective, scale, shadows, and depth.
- BACKGROUND: Always use a pure white studio background (#FFFFFF). This is mandatory and non-negotiable. The background must be a clean, seamless, infinite white — standard for professional fashion studio photography. No gradients, no shadows on background, no textures, no patterns, no environments, no props, no editorial styling on the background.
- The white background must be flat, uniform, and extend seamlessly behind and around the subject.
- Floor shadows should be soft, minimal, and cast downward only — never onto the white background walls.
- Prioritize a polished, premium, fashion-forward visual result consistent with professional e-commerce and studio fashion photography.

QUALITY OVER SPEED:
- Prioritize maximum image quality over generation speed.
- It is acceptable to take longer processing time if needed to achieve a superior result.
- Focus on excellence in realism, fidelity, detail accuracy, garment integration, and facial preservation.
- Prefer a slower, higher-quality generation path rather than a faster, lower-quality output.
- Optimize for the best possible final image, even if render time increases.
- Do not simplify details in order to speed up processing.
- Treat this as a premium-quality render where visual excellence is the top priority.

PHOTOGRAPHIC STYLE:
{
  "camera": {
    "model": "Mamiya RZ67",
    "lens": "110mm f/2.8",
    "look": "medium-format editorial fashion photography"
  },
  "film": {
    "type": "Kodak Portra 800",
    "grain": "subtle natural film grain",
    "color_response": "soft highlights, rich skin tones, refined fashion color palette"
  },
  "lighting": {
    "key_light": "soft 45-degree editorial key light",
    "fill_light": "low intensity natural fill",
    "shadow_quality": "soft realistic shadows",
    "skin_lighting": "natural, flattering, not over-retouched"
  },
  "skin_details": {
    "pores": "visible fine pores",
    "texture": "natural micro-relief skin texture",
    "vellus_hair": "subtle",
    "freckles": "natural if present in reference",
    "retouching": "premium but realistic"
  },
  "shading": {
    "subsurface_scattering": "melanin-aware natural skin rendering",
    "roughness": {
      "cheeks": "slightly higher",
      "t_zone": "slightly lower"
    },
    "specular": {
      "model": "GGX",
      "ior": 1.48
    }
  },
  "geometry_detail": {
    "micro_displacement": true,
    "normal_map": "high-resolution",
    "fabric_micro_texture": true
  },
  "post_processing": {
    "plastic_skin": false,
    "over_retouching": false,
    "noise_reduction": "minimal",
    "sharpening": "subtle editorial sharpening",
    "color_grading": "luxury fashion editorial grade"
  }
}

QUALITY REQUIREMENTS:
- Ultra-realistic output.
- High-detail premium fashion editorial quality.
- Accurate body proportions from CUSTOMER_PHOTO.
- Accurate head placement and body shape from CUSTOMER_PHOTO.
- Complete facial identity preserved from CUSTOMER_PHOTO.
- Natural anatomical coherence.
- Realistic clothing fit.
- Realistic skin texture.
- Realistic fabric texture and physics.
- Realistic shadow integration.
- Realistic lighting consistency.
- Commercial-grade image quality.
- Luxury visual direction.
- 4K quality or higher.
- Suitable for premium virtual try-on and fashion retail.
- Extremely high fidelity to the source images.
- Maximum clarity on face, garment details, and body structure.
- Premium rendering quality with careful preservation of fine visual details.

NEGATIVE INSTRUCTIONS:
- Do not replace or substitute the customer with a generic or idealized model.
- Do not change the body shape from CUSTOMER_PHOTO.
- Do not change the pose from CUSTOMER_PHOTO.
- Do not change the silhouette from CUSTOMER_PHOTO.
- Do not change the head angle from CUSTOMER_PHOTO.
- Do not change the head size from CUSTOMER_PHOTO.
- No face swap look.
- No pasted-on face effect.
- No detached head effect.
- No cartoon style.
- No plastic skin.
- No over-smoothed face.
- No unrealistic anatomy.
- No face distortion.
- No identity loss.
- No body distortion.
- No warped limbs.
- No extra fingers.
- No duplicated body parts.
- No floating garment.
- No incorrect garment scaling.
- No melted fabric.
- No unrealistic clothing fit.
- No pasted-on clothing effect.
- No mismatched skin tone.
- No broken shadows.
- No low-resolution result.
- No blur on face or garment.
- No beauty-filter look.
- No generic model replacement.
- No changes to the garment design.
- No colored background.
- No gradient background.
- No textured background.
- No environmental background (no streets, rooms, nature, or any scene).
- No editorial background styling.
- No dark background.
- No gray background.
- No background that is anything other than pure white (#FFFFFF).
- No text.
- No logo.
- No watermark.
- No UI elements.
- No buttons.
- No social-media screenshot appearance.
- No explanatory overlays.

OUTPUT:
Return a single final image only.

The final image must show:
- the customer's complete appearance — full-body structure, pose, proportions, and face — accurately preserved from CUSTOMER_PHOTO,
- the correct garment accurately derived from GARMENT_IMAGE,
all combined into one seamless, realistic, premium high-fashion editorial image.`

export type VirtualTryOnBackgroundMode = 'white' | 'custom'

const WHITE_INPUT_ORDER = `The input images are provided in this semantic order:
1. CUSTOMER_PHOTO
2. GARMENT_IMAGE`

const CUSTOM_INPUT_ORDER = `The input images are provided in this semantic order:
1. CUSTOMER_PHOTO
2. GARMENT_IMAGE
3. BACKGROUND_IMAGE`

const WHITE_BACKGROUND_INSTRUCTIONS = `- BACKGROUND: Always use a pure white studio background (#FFFFFF). This is mandatory and non-negotiable. The background must be a clean, seamless, infinite white — standard for professional fashion studio photography. No gradients, no shadows on background, no textures, no patterns, no environments, no props, no editorial styling on the background.
- The white background must be flat, uniform, and extend seamlessly behind and around the subject.
- Floor shadows should be soft, minimal, and cast downward only — never onto the white background walls.`

const CUSTOM_BACKGROUND_INSTRUCTIONS = `- BACKGROUND: Use BACKGROUND_IMAGE as the mandatory background reference for the final image. This is the store's configured Cabine background and must replace the default white studio background.
- Preserve the visual identity, colors, lighting mood, materials, and spatial feel of BACKGROUND_IMAGE while keeping the customer and garment as the main subject.
- Integrate the person naturally into BACKGROUND_IMAGE with correct perspective, scale, contact shadows, and depth. Do not generate a pure white background unless BACKGROUND_IMAGE itself is pure white.`

const WHITE_NEGATIVE_BACKGROUND_INSTRUCTIONS = `- No colored background.
- No gradient background.
- No textured background.
- No environmental background (no streets, rooms, nature, or any scene).
- No editorial background styling.
- No dark background.
- No gray background.
- No background that is anything other than pure white (#FFFFFF).`

const CUSTOM_NEGATIVE_BACKGROUND_INSTRUCTIONS = `- Do not ignore BACKGROUND_IMAGE.
- Do not replace BACKGROUND_IMAGE with a pure white studio background.
- Do not invent a different location or scene unrelated to BACKGROUND_IMAGE.
- Do not let the background overpower the customer or garment.`

export function buildVirtualTryOnPrompt(backgroundMode: VirtualTryOnBackgroundMode): string {
  if (backgroundMode === 'white') return VIRTUAL_TRYON_PROMPT

  return VIRTUAL_TRYON_PROMPT.replace(WHITE_INPUT_ORDER, CUSTOM_INPUT_ORDER)
    .replace(
      `2. GARMENT_IMAGE:
A product/reference image of the exact store garment. Use this image to identify and apply the correct clothing item, including its category, design, structure, fit, color, pattern, fabric, texture, details, accessories, and styling direction.`,
      `2. GARMENT_IMAGE:
A product/reference image of the exact store garment. Use this image to identify and apply the correct clothing item, including its category, design, structure, fit, color, pattern, fabric, texture, details, accessories, and styling direction.

3. BACKGROUND_IMAGE:
The configured store background for the Cabine. Use this as the exact background reference when composing the final image.`,
    )
    .replace(WHITE_BACKGROUND_INSTRUCTIONS, CUSTOM_BACKGROUND_INSTRUCTIONS)
    .replace(WHITE_NEGATIVE_BACKGROUND_INSTRUCTIONS, CUSTOM_NEGATIVE_BACKGROUND_INSTRUCTIONS)
    .replace(
      `- the correct garment accurately derived from GARMENT_IMAGE,`,
      `- the correct garment accurately derived from GARMENT_IMAGE,
- the configured store background accurately derived from BACKGROUND_IMAGE,`,
    )
}

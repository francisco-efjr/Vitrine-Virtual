/**
 * Customer-facing rejection messages — research deliverable section 7.
 *
 * IMPORTANT (brand voice):
 *   - Never expose the word "AI", "model", "render", "generate".
 *   - Always say "Virtual Try-On", "show", "preview".
 *   - Always friendly, specific, and offer a path forward.
 *
 * Each entry has a stable key the orchestrator can return in the API
 * response so the front-end can render the right copy (and localize).
 */
export type RejectionReason =
  | 'no_person'
  | 'multiple_people'
  | 'too_blurry'
  | 'bad_lighting'
  | 'partial_body'
  | 'selfie_for_bottom'
  | 'selfie_for_top_cropped'
  | 'no_face'
  | 'low_resolution'
  | 'target_region_occluded'
  | 'garment_unclear'
  | 'pose_mismatch'
  | 'uncertain'

export interface RejectionMessage {
  key: RejectionReason
  /** Short label for analytics, never shown to the customer. */
  internalLabel: string
  /** EN copy (default). */
  en: string
  /** PT-BR copy (Vitrine Virtual primary locale). */
  ptBr: string
}

export const REJECTION_MESSAGES: Record<RejectionReason, RejectionMessage> = {
  no_person: {
    key: 'no_person',
    internalLabel: 'No person detected in customer photo',
    en: "We couldn't find a clear photo of you in this image. Please upload a photo where you are visible.",
    ptBr:
      'Não conseguimos encontrar você nesta foto. Por favor, envie uma foto onde você apareça com clareza.',
  },
  multiple_people: {
    key: 'multiple_people',
    internalLabel: 'More than one person in customer photo',
    en: 'Your photo shows more than one person. Please upload a photo where you are the only person in the frame.',
    ptBr:
      'Sua foto mostra mais de uma pessoa. Por favor, envie uma foto em que apenas você apareça.',
  },
  too_blurry: {
    key: 'too_blurry',
    internalLabel: 'Customer photo below sharpness threshold',
    en: 'This photo looks a little blurry. Please upload a sharper photo so we can show the best Virtual Try-On result.',
    ptBr:
      'Esta foto está um pouco desfocada. Envie uma foto mais nítida para um resultado melhor no Provador Virtual.',
  },
  bad_lighting: {
    key: 'bad_lighting',
    internalLabel: 'Customer photo lighting out of range',
    en: 'The lighting in this photo makes it hard to show an accurate Virtual Try-On. Please upload a photo with more even light.',
    ptBr:
      'A iluminação desta foto está difícil. Envie uma foto com luz mais uniforme.',
  },
  partial_body: {
    key: 'partial_body',
    internalLabel: 'Body partially out of frame',
    en: 'We can only see part of your body in this photo. Please upload a full-body photo from head to feet.',
    ptBr:
      'Só conseguimos ver parte do seu corpo. Envie uma foto de corpo inteiro, da cabeça aos pés.',
  },
  selfie_for_bottom: {
    key: 'selfie_for_bottom',
    internalLabel: 'Selfie sent for bottoms/one-piece category',
    en: 'To try on this item, we need to see your full body. Please upload a photo that includes your legs as well.',
    ptBr:
      'Para experimentar esta peça, precisamos ver seu corpo inteiro. Envie uma foto que inclua suas pernas.',
  },
  selfie_for_top_cropped: {
    key: 'selfie_for_top_cropped',
    internalLabel: 'Selfie cropped above the chest',
    en: 'Please upload a photo that shows your face and your upper body, so we can show the best result.',
    ptBr:
      'Envie uma foto que mostre seu rosto e a parte de cima do corpo para um resultado melhor.',
  },
  no_face: {
    key: 'no_face',
    internalLabel: 'Face not detectable',
    en: 'We need to see your face so we can keep your look in the Virtual Try-On. Please upload a photo where your face is visible.',
    ptBr:
      'Precisamos ver seu rosto para preservar o seu visual no Provador Virtual. Envie uma foto com o rosto visível.',
  },
  low_resolution: {
    key: 'low_resolution',
    internalLabel: 'Image below minimum resolution',
    en: 'This photo is a bit small. Please upload a larger or sharper photo for the best result.',
    ptBr:
      'Esta foto está pequena. Envie uma foto maior ou mais nítida para um resultado melhor.',
  },
  target_region_occluded: {
    key: 'target_region_occluded',
    internalLabel: 'Target garment region occluded',
    en: 'Something is covering the area where the garment would be shown. Please upload a photo where this area is clearly visible.',
    ptBr:
      'Algo está cobrindo a área onde a peça apareceria. Envie uma foto em que essa área esteja bem visível.',
  },
  garment_unclear: {
    key: 'garment_unclear',
    internalLabel: 'Garment photo not detectable',
    en: "We couldn't read this garment photo clearly. Please make sure the item is shown fully and centered.",
    ptBr:
      'Não conseguimos ler a foto da peça com clareza. Verifique se ela aparece inteira e centralizada.',
  },
  pose_mismatch: {
    key: 'pose_mismatch',
    internalLabel: 'Pose incompatible with garment category',
    en: 'Please upload a standing photo so the item drapes correctly in the Virtual Try-On.',
    ptBr:
      'Envie uma foto em pé para que a peça caia corretamente no Provador Virtual.',
  },
  uncertain: {
    key: 'uncertain',
    internalLabel: 'Quality gate uncertain — soft warning',
    en: "We're not sure we can show this photo at the quality we expect. Want to try a different photo, or continue anyway?",
    ptBr:
      'Não temos certeza se conseguiremos mostrar esta foto com a qualidade esperada. Quer tentar outra foto ou continuar mesmo assim?',
  },
}

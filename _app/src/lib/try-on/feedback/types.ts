/**
 * Feedback loop schema — research deliverable section 9.
 *
 * The customer sees a single optional Yes/No question, then (only on "No")
 * one follow-up reason. Everything is non-intrusive and skippable.
 *
 * The data flows into a Supabase table that the dev should create with the
 * SQL in `_app/supabase/` (a migration is suggested in the README).
 *
 * IMPORTANT: this data does NOT retrain any model. We are not training. The
 * loop drives:
 *   1. Prompt-variant A/B selection (research section 9.3.1)
 *   2. Tier router weights (research section 9.3.2)
 *   3. Quality-gate threshold tuning (research section 9.3.3)
 *   4. An internal evaluation set for prompt regressions (research section 9.3.4)
 */

export type FeedbackRating = 'positive' | 'negative' | 'skipped'

export type FeedbackReason =
  | 'face_didnt_look_like_me'
  | 'body_shape_changed'
  | 'clothing_looked_wrong'
  | 'image_not_realistic'
  | 'background_looked_bad'
  | 'other'

export interface FeedbackOption {
  key: FeedbackReason
  en: string
  ptBr: string
}

export const FEEDBACK_REASONS: FeedbackOption[] = [
  {
    key: 'face_didnt_look_like_me',
    en: "The face didn't look like me",
    ptBr: 'O rosto não se parecia comigo',
  },
  {
    key: 'body_shape_changed',
    en: 'My body shape looked different',
    ptBr: 'Meu corpo ficou diferente',
  },
  {
    key: 'clothing_looked_wrong',
    en: 'The clothing looked wrong',
    ptBr: 'A peça ficou estranha',
  },
  {
    key: 'image_not_realistic',
    en: "The image didn't look realistic",
    ptBr: 'A imagem não pareceu realista',
  },
  {
    key: 'background_looked_bad',
    en: 'The background looked bad',
    ptBr: 'O fundo ficou ruim',
  },
  { key: 'other', en: 'Other', ptBr: 'Outro' },
]

export interface FeedbackRecord {
  /** UUID of the generation this feedback belongs to. */
  generationId: string
  rating: FeedbackRating
  reason?: FeedbackReason
  /** Optional free-text when reason === 'other'. PII screened upstream. */
  freeText?: string
  /** Filled by the API handler. */
  createdAt: string
}

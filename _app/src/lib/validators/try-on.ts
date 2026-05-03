import { z } from 'zod'

export const tryOnRequestSchema = z.object({
  peca_id: z.string().uuid('peca_id inválido'),
  turnstile_token: z.string().min(1, 'Token de verificação obrigatório'),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'É necessário concordar com o uso da foto' }),
  }),
})
export type TryOnRequest = z.infer<typeof tryOnRequestSchema>

export const tryOnClientPhotosSchema = z.object({
  selfie: z.object({
    name: z.string().min(1),
  }),
  corpo_inteiro: z.object({
    name: z.string().min(1),
  }),
})
export type TryOnClientPhotos = z.infer<typeof tryOnClientPhotosSchema>

export const tryOnResultSchema = z.object({
  result_url: z.string().url(),
  provider: z.enum(['fashn', 'replicate', 'google', 'openai']),
  duration_ms: z.number().int().nonnegative(),
  expires_at: z.string().datetime(),
})
export type TryOnResult = z.infer<typeof tryOnResultSchema>

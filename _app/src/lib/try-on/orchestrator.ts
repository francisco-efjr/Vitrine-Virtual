import 'server-only'
import { logger } from '@/lib/logger'
import { fashnProvider } from './fashn'
import { googleAiProvider } from './google-ai'
import { replicateProvider } from './replicate'
import {
  TryOnProviderError,
  type TryOnProvider,
  type TryOnProviderInput,
  type TryOnProviderResult,
} from './types'

/**
 * Orquestrador: tenta providers em sequência até um ter sucesso.
 *
 * Ordem padrão de prioridade:
 *   1. FASHN.ai      — primário (melhor qualidade, mais rápido)
 *   2. Google Gemini — secundário (bom custo-benefício, estilo fashion)
 *   3. Replicate     — último recurso (modelo IDM-VTON, latência maior)
 *
 * A ordem pode ser sobrescrita no teste passando `providers` explicitamente.
 */
export async function generateTryOn(
  input: TryOnProviderInput,
  providers: TryOnProvider[] = [fashnProvider, googleAiProvider, replicateProvider],
): Promise<TryOnProviderResult & { provider: TryOnProvider['name'] }> {
  let lastErr: unknown

  for (const provider of providers) {
    try {
      const result = await provider.generate(input)
      return { ...result, provider: provider.name }
    } catch (err) {
      lastErr = err
      const isRetriable = err instanceof TryOnProviderError ? err.retriable : true
      logger.warn('Provider falhou, tentando próximo', {
        provider: provider.name,
        retriable: isRetriable,
        message: err instanceof Error ? err.message : String(err),
      })

      if (!isRetriable) {
        throw err
      }
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new TryOnProviderError('Todos os providers falharam', 'unknown', true)
}

import 'server-only'
import { fashnProvider } from './fashn'
import { replicateProvider } from './replicate'
import {
  TryOnProviderError,
  type TryOnProvider,
  type TryOnProviderInput,
  type TryOnProviderResult,
} from './types'
import { logger } from '@/lib/logger'

/**
 * Orquestrador: tenta primário (FASHN), cai para fallback (Replicate) se necessário.
 * Estrutura permite trocar/adicionar providers sem mudar a rota /api/try-on.
 */
export async function generateTryOn(
  input: TryOnProviderInput,
  providers: TryOnProvider[] = [fashnProvider, replicateProvider],
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
        // Erro definitivo — não tenta os próximos
        break
      }
    }
  }

  if (lastErr instanceof TryOnProviderError) throw lastErr
  throw new TryOnProviderError(
    'Todos os providers falharam',
    'orchestrator',
    false,
  )
}

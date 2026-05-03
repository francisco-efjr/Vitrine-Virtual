import 'server-only'
import { logger } from '@/lib/logger'
import { isFeatureConfigured } from '@/lib/env'
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
 * Ordem de prioridade (baseada nas keys configuradas no .env.local):
 *   1. FASHN.ai           — primário (melhor qualidade, especializado em fashion)
 *   2. Nano Banana        — secundário (Gemini 2.5 Flash Image, custo/latência bons)
 *   3. Replicate          — último recurso (IDM-VTON, latência maior)
 *
 * Providers sem key configurada são pulados silenciosamente antes de tentar.
 * A ordem pode ser sobrescrita no teste passando `providers` explicitamente.
 */

function buildDefaultProviders(): TryOnProvider[] {
  const providers: TryOnProvider[] = []

  // Cada provider só entra na lista se tiver key configurada.
  // Isso evita tentativas desnecessárias que resultariam em erro non-retriable.
  if (isFeatureConfigured('try_on_fashn')) providers.push(fashnProvider)
  if (isFeatureConfigured('try_on_google')) providers.push(googleAiProvider)
  if (isFeatureConfigured('try_on_replicate')) providers.push(replicateProvider)

  // Fallback: inclui todos (cada um vai lançar erro non-retriable se sem key)
  // Isso garante mensagem de erro clara em vez de "lista vazia".
  if (providers.length === 0) {
    providers.push(fashnProvider, googleAiProvider, replicateProvider)
  }

  return providers
}

export async function generateTryOn(
  input: TryOnProviderInput,
  providers: TryOnProvider[] = buildDefaultProviders(),
): Promise<TryOnProviderResult & { provider: TryOnProvider['name'] }> {
  let lastErr: unknown

  logger.info('Try-on: iniciando geração', {
    providers: providers.map((p) => p.name),
  })

  for (const provider of providers) {
    try {
      const result = await provider.generate(input)
      logger.info('Try-on: sucesso', { provider: provider.name, durationMs: result.durationMs })
      return { ...result, provider: provider.name }
    } catch (err) {
      lastErr = err
      const isRetriable = err instanceof TryOnProviderError ? err.retriable : true
      logger.warn('Try-on: provider falhou, tentando próximo', {
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

/**
 * Gera links wa.me com mensagem pré-preenchida.
 *
 * - Aceita números em qualquer formato e normaliza para apenas dígitos.
 * - Adiciona código BR (+55) se não tiver código de país.
 * - Encoda mensagem corretamente.
 *
 * Spec do WhatsApp: https://faq.whatsapp.com/5913398998672934
 */

const BR_COUNTRY = '55'

/** Remove tudo que não for dígito e garante prefixo do Brasil quando ausente. */
export function normalizePhoneToWaMe(input: string): string | null {
  if (!input) return null
  const digits = input.replace(/\D/g, '')
  if (!digits) return null
  // Já tem código do país (>= 12 dígitos com DDD)?
  if (digits.length >= 12 && digits.startsWith(BR_COUNTRY)) return digits
  if (digits.length >= 12) return digits // outro país, deixa como está
  // Brasil: DDD + número (10 ou 11 dígitos) → adiciona +55
  if (digits.length === 10 || digits.length === 11) return BR_COUNTRY + digits
  return null
}

export function buildWhatsAppUrl(phone: string, message?: string): string | null {
  const normalized = normalizePhoneToWaMe(phone)
  if (!normalized) return null
  const base = `https://wa.me/${normalized}`
  if (!message) return base
  return `${base}?text=${encodeURIComponent(message)}`
}

/**
 * Mensagem pré-preenchida para o botão "Falar no WhatsApp" da vitrine.
 * Texto definido no design handoff (chat com designer).
 */
export function buildVitrineMessage(opts: {
  pecaNome?: string | null
  lojaNome?: string | null
}): string {
  if (opts.pecaNome) {
    return `Olá! Vi a peça "${opts.pecaNome}" na vitrine e adorei! Gostaria de mais informações.`
  }
  if (opts.lojaNome) {
    return `Olá, ${opts.lojaNome}! Vi sua vitrine e gostaria de mais informações sobre as peças.`
  }
  return 'Olá! Vi sua vitrine e gostaria de mais informações.'
}

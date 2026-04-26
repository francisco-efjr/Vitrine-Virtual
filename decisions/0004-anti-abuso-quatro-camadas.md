# ADR 0004 — Anti-abuso da IA paga em 4 camadas

> **Status:** Aceita
> **Data:** 2026-04-25
> **Decisores:** Francisco (cliente/PO) + Claude

## Contexto

A vitrine pública é acessível **sem login**. Cada chamada ao provador virtual ([[0002-provador-ia-fashn-replicate|FASHN.ai/Replicate]]) custa US$ 0,04–0,15. Sem proteção, um único ataque automatizado pode:

- Esgotar os créditos pré-pagos da IA em minutos.
- Gerar fatura inesperada para o cliente.
- Desligar o serviço para usuários legítimos.

Restrições:
- Não pode adicionar fricção visível para uso real (cliente final é leigo, mobile, sem login).
- Precisa de **defesa em profundidade** — falha em uma camada não derruba todas.
- Precisa de **kill switch** controlável pelo Francisco a qualquer momento.

## Decisão

Implementar **quatro camadas independentes** de proteção, todas obrigatórias antes de chamar a IA:

| Camada | Mecanismo | Limite default |
|---|---|---|
| **1. CAPTCHA invisível** | Cloudflare Turnstile (token validado server-side) | — (apenas verifica que é humano) |
| **2. Rate limit por IP** | Upstash Redis (sliding window) | 5/h, 20/dia, 50/semana por IP |
| **3. Cota mensal por loja** | Query em `try_on_uses` antes de cada chamada | 200 gerações/mês (configurável por loja) |
| **4. Kill switch global** | Flag em `system_settings.try_on_enabled` + cron diário que checa gasto acumulado | Default ON, desliga ao atingir `TRY_ON_MONTHLY_BUDGET_USD` (ex: US$ 100) |

Todas as quatro são **AND**, não OR — se qualquer uma negar, a chamada não acontece.

## Alternativas consideradas

- **Apenas Turnstile:** Insuficiente. Bots sofisticados resolvem Turnstile (custo de ~US$ 1 por mil resoluções via serviços como 2captcha).
- **Apenas rate limit por IP:** Insuficiente. Atacante usa proxy pool e distribui requisições.
- **Apenas cota por loja:** Mata o uso legítimo se um único IP abusar de uma loja específica.
- **Login obrigatório para usar provador:** Rejeitada — adiciona fricção que mata conversão.

A combinação das 4 cobre vetores diferentes:
- Turnstile filtra bots não-sofisticados (90% do ruído).
- Rate limit por IP contém ataques de IP único.
- Cota por loja contém ataques distribuídos focados em uma loja.
- Kill switch global é a garantia financeira final.

## Consequências

- ✅ **Positivas:**
  - Francisco nunca toma um susto na fatura da IA.
  - Cota por loja vira **vetor comercial futuro**: planos pagos podem aumentar a cota.
  - Kill switch dá controle de produto (ex: pausar para manutenção).
  - Nenhuma camada é visível para o usuário legítimo (Turnstile é invisível, os limites são generosos para uso real).
  - Métricas de cota viram dado útil no dashboard da loja.

- ⚠️ **Negativas / trade-offs:**
  - Quatro pontos de falha — qualquer um quebrado pode bloquear a IA. Mitigação: testes de integração específicos por camada e fallback para "tente novamente" em vez de "erro genérico".
  - Cron diário de checagem de orçamento exige Vercel Cron ou GitHub Actions agendado.
  - Lógica de cota por loja exige consulta extra ao banco antes de cada try-on (~50ms). Mitigação: cache em Redis (Upstash) com TTL curto.

- 🔄 **Reversibilidade:** Alta. Cada camada pode ser desligada via env var sem deploy.

## Pseudocódigo da rota

```typescript
// src/app/api/try-on/route.ts (esboço)
export async function POST(req: Request) {
  // 0. Kill switch global
  if (!await isTryOnEnabled()) return error(503, 'Provador temporariamente indisponível')

  // 1. Turnstile
  const { turnstileToken, peca_id, foto } = await parseRequest(req)
  if (!await verifyTurnstile(turnstileToken)) return error(403, 'Verificação falhou')

  // 2. Rate limit por IP
  const ipHash = hashIp(req.headers.get('x-forwarded-for'))
  const rl = await rateLimit.check(ipHash)
  if (!rl.success) return error(429, 'Muitas tentativas, tente em alguns minutos')

  // 3. Cota mensal da loja
  const peca = await getPecaById(peca_id)
  const usoMes = await contarUsoMesLoja(peca.loja_id)
  if (usoMes >= peca.loja.cota_try_on_mensal) {
    return error(429, 'O provador desta loja atingiu o limite mensal')
  }

  // OK — chamar IA
  const result = await orchestrator.generateTryOn({ peca, foto })
  await logTryOnUse({ loja_id: peca.loja_id, peca_id, ipHash, success: true })
  return json(result)
}
```

## Referências

- [[../README|README do projeto]]
- [[0002-provador-ia-fashn-replicate|ADR 0002 — Provador IA]]
- [[0006-privacidade-foto-cliente-final|ADR 0006 — Privacidade]]
- [[../notes/proposta-tecnica-v1|Proposta Técnica v1 — seção 9.4]]
- Cloudflare Turnstile: https://www.cloudflare.com/products/turnstile/
- Upstash Redis: https://upstash.com/docs/redis

---
**Tags:** #adr #projeto/vitrine-virtual #seguranca #ia #anti-abuso

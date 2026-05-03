# ADR 0002 — Provador IA: FASHN.ai (primário) + Replicate IDM-VTON (fallback)

> **Status:** Substituída por [[0011-nano-banana-substitui-fashn|ADR 0011]] (em 02/05/2026)
> **Data original:** 2026-04-25
> **Decisores:** Francisco (cliente/PO) + Claude
>
> ⚠️ **Esta ADR não vale mais como decisão ativa.** A escolha de provider mudou para Gemini 2.5 Flash Image (Nano Banana). O documento permanece para histórico — as 4 camadas anti-abuso ([[0004-anti-abuso-quatro-camadas]]), a regra de privacidade ([[0006-privacidade-foto-cliente-final]]) e o teto de US$ 0,15/geração continuam valendo, originados aqui.

## Contexto

O recurso central do produto é o **provador virtual com IA**: o cliente final envia uma foto, escolhe uma peça e recebe uma simulação visual de si mesmo usando aquela peça. Restrições do MVP:

- Teto de **US$ 0,15 por geração** definido pelo cliente.
- Lojas pagam pela plataforma, não por geração — então o custo unitário precisa caber na margem do plano.
- Vitrine é pública e não exige login do cliente final → **risco real de abuso** e custo descontrolado se não for protegido (tratado no [[0004-anti-abuso-quatro-camadas|ADR 0004]]).
- A foto do cliente final **não pode ser persistida** ([[0006-privacidade-foto-cliente-final|ADR 0006]]).
- Latência aceitável: até ~15s para uma boa UX.
- Deve funcionar a partir de uma URL pública da peça + uma foto enviada na hora.

## Decisão

**FASHN.ai como provedor primário** + **Replicate (modelo IDM-VTON) como fallback automático** em caso de falha/timeout.

## Alternativas consideradas

| Provedor | Custo/geração | Latência | Qualidade | Decisão |
|---|---|---|---|---|
| **FASHN.ai** ⭐ | US$ 0,04–0,08 | 5–10s | Alta, comercial | **Escolhido como primário.** REST limpa, docs claras, sem mínimo mensal, opt-out de retenção via header. |
| **Replicate (IDM-VTON / OOTDiffusion)** | US$ 0,02–0,05 | 20–40s | Média–alta | **Escolhido como fallback.** Mais barato, latência maior, mas roda em paralelo só se primário falhar. |
| Kling AI Virtual Try-on | US$ 0,10–0,15 | 8–15s | Muito alta | Rejeitado: provedor chinês, dúvida regulatória LGPD, API menos estável. |
| Pixelcut | US$ 0,08–0,12 | 5–10s | Alta | Rejeitado: API menos madura no momento da decisão. |
| Google Vertex AI VTO | US$ 0,30+ | 5–10s | Topo | Rejeitado: acima do teto orçado. |
| Solução 2D sem IA (overlay/canvas) | ~ US$ 0 | < 1s | Baixa | Rejeitado: pode prejudicar percepção de produto, justamente o diferencial competitivo. |
| Adiar IA para v1.1 (placeholder no MVP) | — | — | — | Rejeitado: o cliente quer validar o produto **com** o diferencial principal funcionando. |

## Consequências

- ✅ **Positivas:**
  - Qualidade comercial dentro do orçamento.
  - Fallback automático aumenta resiliência (se FASHN cair, Replicate atende com latência maior, mas atende).
  - Camada de orquestração `src/lib/try-on/orchestrator.ts` isola provedores → trocar/adicionar IA é localizada.
  - Possibilidade de A/B testar provedores no futuro (qual gera melhor conversão para WhatsApp).

- ⚠️ **Negativas / trade-offs:**
  - Dois provedores = duas contas, duas chaves API, dois SDKs/clientes para manter.
  - FASHN tem retenção default de 30 dias da imagem enviada — precisamos garantir o opt-out via header `X-No-Retention: true` em **todas** as requisições.
  - Custo é sensível ao volume — kill switch global ([[0004-anti-abuso-quatro-camadas]]) é obrigatório.
  - Latência do Replicate (20–40s) pode esbarrar no limite de 25s da Edge Function da Vercel → fallback pode precisar rodar em Node Function (sem o limite de 25s).

- 🔄 **Reversibilidade:** Alta. A camada de orquestração permite trocar qualquer provedor em horas.

## Implementação

```typescript
// src/lib/try-on/orchestrator.ts (esboço)
export async function generateTryOn(input: TryOnInput): Promise<TryOnResult> {
  try {
    return await fashnAi.generate(input, { noRetention: true })
  } catch (err) {
    logger.warn('FASHN failed, falling back to Replicate', { err })
    return await replicate.generate(input)
  }
}
```

## Referências

- [[../README|README do projeto]]
- [[0004-anti-abuso-quatro-camadas|ADR 0004 — Anti-abuso]]
- [[0006-privacidade-foto-cliente-final|ADR 0006 — Privacidade]]
- [[../notes/proposta-tecnica-v1|Proposta Técnica v1 — seção 9]]
- FASHN.ai docs: https://fashn.ai/api
- Replicate IDM-VTON: https://replicate.com/cuuupid/idm-vton

---
**Tags:** #adr #projeto/vitrine-virtual #ia #virtual-try-on

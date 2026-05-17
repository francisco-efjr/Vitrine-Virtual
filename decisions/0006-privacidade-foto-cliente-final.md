# ADR 0006 — Privacidade da foto do cliente final no provador virtual

> **Status:** ⚠️ **Substituída por [[0009-armazenamento-foto-e-aprendizado-qualidade|ADR 0009]]** (2026-05-17)
> **Data:** 2026-04-25
> **Decisores:** Francisco (cliente/PO) + Claude
>
> **Nota:** a decisão de *nunca* persistir a foto do cliente foi revista. O PO
> priorizou uma base de aprendizado de qualidade de imagem e optou, de forma
> informada, por armazenar a foto em bucket privado com acesso restrito. Veja a
> [[0009-armazenamento-foto-e-aprendizado-qualidade|ADR 0009]] para a decisão
> vigente e as pendências de LGPD. Este documento é mantido como histórico.

## Contexto

O provador virtual ([[0002-provador-ia-fashn-replicate]]) recebe uma foto do **cliente final** — pessoa física, sem login, frequentemente com seu próprio rosto e corpo na imagem. Trata-se de **dado pessoal sensível** sob a LGPD (art. 5º, II).

O brief do cliente é explícito: *"as fotos enviadas pelo cliente final para o provador virtual não devem ficar salvas permanentemente"* e *"a foto deve ser usada apenas para gerar o resultado naquele momento. Depois disso, ela deve ser apagada ou não armazenada de forma persistente."*

Risco: se uma foto vazar (do nosso storage, de log, ou do provedor IA), há exposição legal (LGPD), reputacional (notícia ruim) e de produto (lojas perdem confiança).

## Decisão

A foto do cliente final **nunca é persistida** — em lugar nenhum:

1. **No nosso lado:** a foto chega como `multipart/form-data` na rota `/api/try-on`, é mantida em **buffer de memória** durante o request e descartada pelo garbage collector ao fim. **Zero gravação** em Supabase Storage, banco, log ou variável de longa duração.

2. **No lado do provedor IA:** chamada ao FASHN.ai sempre com o header `X-No-Retention: true` (suportado pelo plano deles). Para o Replicate (fallback), ativar o flag `disable_safety_checker: false` e configurar a webhook URL de cleanup imediato após resposta.

3. **No log:** logamos apenas `loja_id`, `peca_id`, `ip_hash` (SHA-256 com salt), `success`, `provider`, `provider_request_id`, `error_code`. **Nunca** logamos a foto, e-mail, IP cru, ou qualquer URL temporária do resultado.

4. **No resultado:** a URL temporária do FASHN/Replicate (TTL ~24h do lado deles) é repassada para o cliente. **Não copiamos** o resultado para nosso storage. Após 24h, a URL expira automaticamente.

5. **No consentimento:** antes de o cliente enviar a foto, há checkbox **obrigatório** com o texto:
   > *"Concordo com o uso da minha foto para gerar a simulação. A imagem não será armazenada por esta plataforma e será descartada imediatamente após a geração."*

## Alternativas consideradas

- **Salvar a foto temporariamente para permitir "tentar de novo":** Rejeitada. Aumenta risco LGPD por benefício marginal de UX. Cliente tira/escolhe outra foto se quiser.
- **Salvar o resultado para histórico do cliente:** Rejeitada — fora de escopo do MVP, e exigiria login do cliente final (que não existe).
- **Salvar a foto em formato hash/embedding (irreversível):** Rejeitada — ainda é dado pessoal sob LGPD por ser potencialmente reidentificável e não traz benefício no MVP.

## Consequências

- ✅ **Positivas:**
  - Conformidade LGPD desde o dia 1 (princípios da minimização e necessidade — art. 6º, III).
  - Reduz risco de incidente a quase zero do nosso lado.
  - Simplifica auditoria e DPO (não há dado para mostrar em pedido de exclusão — não temos nada).
  - Custo de storage menor.

- ⚠️ **Negativas / trade-offs:**
  - Cliente final perde a foto se atualizar a página antes de salvar localmente. Mitigação: instrução clara na UI para baixar antes de fechar.
  - Não conseguimos auditar (depois) por que uma geração específica deu resultado ruim — só temos `provider_request_id`.
  - Dependemos do FASHN/Replicate honrarem o opt-out de retenção. Mitigação: termo de uso deles explicita o comportamento; revisar em DPIA simples antes do go-live.

- 🔄 **Reversibilidade:** Alta para o oposto (passar a salvar é fácil). Mas se algum dia precisarmos salvar, será necessário consentimento renovado dos usuários.

## Implementação prática

```typescript
// src/app/api/try-on/route.ts (esboço)
export async function POST(req: Request) {
  const formData = await req.formData()
  const fotoFile = formData.get('foto') as File
  
  // foto vive APENAS aqui, em memória
  const fotoBuffer = await fotoFile.arrayBuffer()
  
  try {
    // checagens anti-abuso primeiro (ADR 0004)
    // ...
    
    const result = await orchestrator.generateTryOn({
      fotoBuffer,
      pecaUrl: peca.foto_principal_url,
      noRetention: true, // <-- crítico
    })
    
    // log SANITIZADO
    await logTryOnUse({
      loja_id: peca.loja_id,
      peca_id: peca.id,
      ip_hash: hashIp(req.headers.get('x-forwarded-for')),
      success: true,
      provider: result.provider,
      provider_request_id: result.requestId,
      // NUNCA: foto, ip cru, e-mail, url do resultado
    })
    
    return Response.json({ resultUrl: result.url })
    // fotoBuffer sai de escopo aqui → GC limpa
  } catch (err) {
    // log de erro também sem foto
    await logTryOnUse({ ..., success: false, error_code: err.code })
    return Response.json({ error: '...' }, { status: 500 })
  }
}
```

## Página /privacidade (esqueleto)

A política de privacidade pública vai cobrir:
- Quem é o controlador (Francisco / razão social).
- Que dados são coletados de cada persona (lojista vs cliente final).
- Para que serve cada dado (finalidade).
- Base legal (consentimento para foto do cliente final; legítimo interesse para uso do painel pelo lojista).
- Retenção (foto do cliente: zero. Dados da loja: enquanto a conta estiver ativa).
- Direitos do titular (acesso, correção, exclusão, portabilidade).
- Contato: e-mail do controlador.

## Referências

- [[../README|README do projeto]]
- [[0002-provador-ia-fashn-replicate|ADR 0002 — Provador IA]]
- [[0004-anti-abuso-quatro-camadas|ADR 0004 — Anti-abuso]]
- [[../notes/proposta-tecnica-v1|Proposta Técnica v1 — seções 9.3 e 10]]
- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- ANPD — orientações sobre minimização: https://www.gov.br/anpd

---
**Tags:** #adr #projeto/vitrine-virtual #lgpd #privacidade #seguranca

# ADR 0003 — Onboarding manual via painel super-admin

> **Status:** Aceita
> **Data:** 2026-04-25
> **Decisores:** Francisco (cliente/PO) + Claude

## Contexto

O Vitrine Virtual será vendido para lojas de roupas. No MVP, o cliente quer:

- **Validar comercialmente** o produto antes de abrir cadastro público.
- **Filtrar manualmente** quais lojas entram no sistema (evitar spam, contas-fantasma e abuso da IA paga por cadastros não-qualificados).
- **Ter controle total** de quem está usando a plataforma na fase inicial.
- Não precisar de UI complexa de signup/onboarding/billing no MVP (não há cobrança ainda).

## Decisão

**Não implementar signup público no MVP.** Em vez disso, criar um **painel super-admin dentro do próprio app** (rota `/admin/super` protegida por whitelist de e-mails) onde Francisco cria as lojas manualmente. O lojista recebe um e-mail com magic link para definir a senha e entrar.

## Alternativas consideradas

- **Opção A — Self-service público:** Página `/cadastro` aberta, qualquer loja se cadastra sozinha. **Rejeitada para o MVP** porque permitiria spam e abuso da IA paga por contas não-qualificadas.

- **Opção B — Cadastro híbrido (público + aprovação manual):** Loja se cadastra, recebe e-mail "em análise", Francisco aprova. **Rejeitada** porque adiciona telas e fluxos sem benefício real no MVP — Francisco prefere controle total nas primeiras dezenas de lojas.

- **Opção C — Script CLI (`npm run create-store`):** Criar lojas via comando de terminal. **Rejeitada** porque exige Francisco ter o código rodando localmente toda vez que cadastrar uma loja nova — não escala nem para 10 lojas.

- **Opção D — Direto no painel do Supabase:** Sem UI, criar usuário no Auth e inserir registro de loja na tabela manualmente. **Rejeitada** porque é frágil (esquecer um campo, errar slug, duplicar e-mail) e não escala.

- **Opção E (escolhida) — Painel super-admin no próprio app:** Rota `/admin/super` protegida, com formulário para criar loja (nome, slug, e-mail do dono, cota de try-on inicial). Sistema gera magic link e envia e-mail automaticamente.

## Consequências

- ✅ **Positivas:**
  - Francisco tem controle total e pode cadastrar de qualquer dispositivo (mobile inclusive).
  - Listagem de todas as lojas em um lugar → métricas operacionais à mão.
  - Reaproveita o sistema de auth e UI já em uso → baixo custo de implementação (~0.5 dia).
  - Base pronta para virar painel admin do SaaS no futuro (cobrança, métricas globais, suporte).

- ⚠️ **Negativas / trade-offs:**
  - Cria uma terceira persona no sistema (super_admin), além de lojista e visitante público.
  - Precisa de proteção extra: whitelist de e-mails em variável de ambiente `SUPER_ADMIN_EMAILS` + role na tabela `profiles` + verificação dupla (e-mail + role) em todas as rotas `/admin/super/**`.
  - Não escala se virarem milhares de lojas — mas isso é um problema de v2/v3, não do MVP.

- 🔄 **Reversibilidade:** Alta. Adicionar signup público depois é trivial — basta criar `/cadastro` e remover o gating.

## Implementação

```typescript
// src/middleware.ts (esboço)
if (pathname.startsWith('/admin/super')) {
  const user = await getUser()
  const allowed = process.env.SUPER_ADMIN_EMAILS?.split(',') ?? []
  if (!user || !allowed.includes(user.email)) {
    return Response.redirect('/login')
  }
  // dupla verificação: também checa role na tabela profiles
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return Response.redirect('/login')
}
```

## Referências

- [[../README|README do projeto]]
- [[0001-stack-supabase-nextjs-vercel|ADR 0001 — Stack base]]
- [[../notes/proposta-tecnica-v1|Proposta Técnica v1 — seção 7]]

---
**Tags:** #adr #projeto/vitrine-virtual #auth #onboarding

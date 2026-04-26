# ADR 0001 — Stack base: Supabase + Next.js + Vercel

> **Status:** Aceita
> **Data:** 2026-04-25
> **Decisores:** Francisco (cliente/PO) + Claude (dev fullstack sênior)

## Contexto

Vitrine Virtual é um SaaS multi-tenant para lojas de roupas, com vitrine pública mobile-first e provador virtual por IA. O MVP precisa:

- Suportar **múltiplas lojas isoladas** desde o dia 1.
- Ter **autenticação pronta e segura** (login, confirmação de e-mail, recuperação de senha).
- Suportar **upload de fotos de peças** com armazenamento.
- Permitir **deploy rápido em produção** com pipeline simples.
- Custar **próximo de zero** enquanto não há tráfego comercial.
- Ser **fácil de evoluir** sem grande lock-in.

## Decisão

Usar **Supabase (Auth + PostgreSQL + Storage)** + **Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui** + **Vercel** para deploy.

## Alternativas consideradas

- **Opção A — Firebase + Next.js + Vercel:** Bom ecossistema Google, free tier generoso. **Rejeitada** porque Firestore é NoSQL — complica relatórios SQL, exportação CSV (requisito do MVP) e a estratégia de multi-tenant exigiria mais código manual. PostgreSQL + RLS resolve multi-tenant nativamente.

- **Opção B — Clerk (auth) + Supabase (DB+storage) + Next.js + Vercel:** Auth premium com UI de login/cadastro pronta. **Rejeitada para o MVP** porque adiciona custo a partir de ~10k usuários e introduz uma dependência extra (Clerk webhook → Supabase) sem benefício decisivo no MVP. Pode ser adotado depois se a UX de auth do Supabase precisar de melhoria.

- **Opção C (escolhida) — Supabase + Next.js + Vercel:** PostgreSQL maduro com RLS para multi-tenant seguro, Auth integrado com JWT, Storage com policies, deploy trivial na Vercel.

- **Opção D — Stack custom (Node + Express + Postgres self-hosted + S3 + Auth próprio):** Máximo controle e sem lock-in. **Rejeitada** porque viola a regra do brief "não construir auth próprio se solução pronta segura resolver" e atrasaria o MVP em semanas com pouca diferenciação.

## Consequências

- ✅ **Positivas:**
  - Auth, banco e storage em um único provedor → menos pontos de falha e menos contas para gerenciar.
  - RLS do PostgreSQL dá isolamento multi-tenant em camada de banco (defesa em profundidade).
  - Free tier do Supabase + Vercel cobre todo o MVP sem custo de infra.
  - Next.js App Router permite SSR para vitrine pública (bom SEO) e CSR para painel admin (boa UX).
  - shadcn/ui dá componentes acessíveis (WCAG AA) sem lock-in (código vive no projeto).
  - Migrations versionadas em `supabase/migrations/` → schema sob controle de versão desde o dia 1.

- ⚠️ **Negativas / trade-offs:**
  - Vendor lock-in moderado no Supabase. Mitigação: camada de acesso a dados em `src/server/**` isola o cliente Supabase do resto do código → migração para Postgres puro futuramente é viável.
  - Free tier do Supabase tem limites (500 MB DB, 1 GB storage, 2 GB egress/mês, 50k MAU). Suficiente para validar, mas precisa monitorar.
  - Edge Functions da Vercel têm limite de 25s de execução (relevante para a chamada do FASHN.ai, que pode levar 10s).

- 🔄 **Reversibilidade:** Média. Trocar Vercel por outra hospedagem (Render, Railway) é trivial. Trocar Supabase por Postgres puro + auth próprio é viável mas custoso (semanas de trabalho).

## Referências

- [[../README|README do projeto]]
- [[0005-multi-tenancy-rls-postgres|ADR 0005 — Multi-tenancy via RLS]]
- [[../notes/proposta-tecnica-v1|Proposta Técnica v1 — seção 3]]
- Supabase: https://supabase.com/docs
- Next.js App Router: https://nextjs.org/docs/app

---
**Tags:** #adr #projeto/vitrine-virtual #stack

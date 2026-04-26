# Vitrine Virtual

> **Status:** 🟢 ativo · em fase de proposta técnica (aguardando aprovação para Sprint 0)
> **Início:** 2026-04-25
> **Prazo:** MVP em ~4 semanas de execução real (6 sprints)

## Objetivo

SaaS multi-loja de vitrine online para lojas de roupas, com **provador virtual por IA**, links públicos compartilháveis e contato direto via WhatsApp. MVP focado em validar o produto no mercado o quanto antes, sem abrir mão de segurança, privacidade e qualidade.

## Contexto

- Cliente: Francisco (também é o stakeholder principal e operador comercial inicial).
- Modelo de negócio: vender o sistema para lojas de roupas (multi-tenant desde o dia 1).
- Onboarding manual no MVP — Francisco cria as contas das lojas pelo painel super-admin.
- Foco do diferencial competitivo: o **provador virtual com IA** (referência de experiência: Zara virtual try-on).

## Stack & Repositório

- **Repo:** _ainda não criado — será criado na Sprint 0_
- **Linguagens:** TypeScript
- **Frameworks:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui
- **Backend/BaaS:** Supabase (Auth + PostgreSQL + Storage + RLS)
- **IA virtual try-on:** FASHN.ai (primário) + Replicate IDM-VTON (fallback)
- **Edge/infra extra:** Upstash Redis (rate limit), Cloudflare Turnstile (CAPTCHA), Sentry (erros)
- **Hospedagem:** Vercel (Hobby tier)
- **Geografia:** Brasil somente (LGPD aplicável)

## Pessoas

- **PO/Stakeholder:** Francisco (francisco.efjr@gmail.com)
- **Time:** Francisco + Claude (eu, dev fullstack sênior)

## Marcos

- [ ] Aprovação da Proposta Técnica v1
- [ ] Criação das contas externas (Supabase, Vercel, FASHN, Replicate, Upstash, Cloudflare, Sentry)
- [ ] Sprint 0 — Fundação (estrutura do repo, lint, CI, Supabase local)
- [ ] Sprint 1 — Auth + painel super-admin
- [ ] Sprint 2 — CRUD de peças + upload de fotos
- [ ] Sprint 3 — Dashboard + listagem geral + CSV
- [ ] Sprint 4 — Configurações + Vitrine pública + WhatsApp
- [ ] Sprint 5 — Provador virtual com IA + 4 camadas anti-abuso
- [ ] Sprint 6 — QA, polish, deploy production, docs finais

## Arquivos importantes

- [[todo|📋 To-do atual]]
- [[REGRAS|📐 Regras de trabalho neste projeto]]
- [[decisions/0001-stack-supabase-nextjs-vercel|🧭 ADR 0001 — Stack base]]
- [[decisions/0002-provador-ia-fashn-replicate|🧭 ADR 0002 — Provador IA]]
- [[decisions/0003-onboarding-manual-super-admin|🧭 ADR 0003 — Onboarding manual]]
- [[decisions/0004-anti-abuso-quatro-camadas|🧭 ADR 0004 — Anti-abuso da IA]]
- [[decisions/0005-multi-tenancy-rls-postgres|🧭 ADR 0005 — Multi-tenancy via RLS]]
- [[decisions/0006-privacidade-foto-cliente-final|🧭 ADR 0006 — Privacidade da foto]]
- [[notes/2026-04-25-discovery|📝 Discovery inicial — 25/04]]
- [[notes/proposta-tecnica-v1|📄 Proposta Técnica v1 (completa)]]
- `notes/` → reuniões, descobertas, experimentos

## Links externos

- Brief original do cliente: histórico desta sessão (25/04/2026)
- Referência de experiência: Zara virtual try-on
- FASHN.ai: https://fashn.ai/api
- Supabase: https://supabase.com
- Vercel: https://vercel.com

## Dúvidas pendentes (não bloqueiam, mas precisam ser respondidas antes da sprint indicada)

| # | Pergunta | Quando preciso |
|---|---|---|
| A | Slugs das primeiras 1–3 lojas | Sprint 1 |
| B | Logo/favicon do produto Vitrine Virtual | Sprint 4 |
| C | Texto pré-preenchido do botão WhatsApp | Sprint 4 |
| D | Customizar e-mail de convite ou usar template padrão Supabase? | Sprint 1 |
| E | Comprar domínio agora ou começar em `*.vercel.app`? | Sprint 6 |
| F | Controlador da política de privacidade (e-mail/CNPJ) | Sprint 6 |

---
**Tags:** #projeto #status/ativo #projeto/vitrine-virtual
"# Vitrine-Virtual" 

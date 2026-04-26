# To-do — Vitrine Virtual

> Lista viva. Itens concluídos podem virar anotações em `notes/`.
> Última atualização: 2026-04-25

## Próximo passo (P0)

- [x] Cliente aprovou a [[notes/proposta-tecnica-v1|Proposta Técnica v1]] em 25/04 — autorizou execução de TUDO que não envolve tela enquanto designer prepara as telas via Claude Designer
- [ ] **Em andamento por mim:** Sprint 0 + camadas server-side de Sprints 1, 2 e 5 (sem UI)
- [ ] Cliente criar contas externas (não-bloqueante para Sprint 0 com Supabase local):
  - [ ] Supabase (free tier) — para deploy
  - [ ] Vercel (Hobby) — para deploy
  - [ ] FASHN.ai (US$ 10 de créditos iniciais) — para Sprint 5 ligar IA real
  - [ ] Replicate (US$ 5 de créditos iniciais — fallback)
  - [ ] Upstash (free tier) — para rate limit em produção
  - [ ] Cloudflare (free tier — Turnstile)
  - [ ] Sentry (free tier)
  - [ ] Decidir: comprar domínio agora ou começar em `*.vercel.app`
- [ ] Receber telas do designer (Claude Designer) — bloqueia Sprints 2/3/4/5 nas partes de UI

## Em andamento

- [x] Salvar tudo no Obsidian (estrutura do projeto criada em 25/04)
- [ ] Sprint 0 — Fundação (estrutura do repo, lint, CI, Supabase local rodando)
- [ ] Schema completo + RLS policies (parte de Sprints 1 e 2 que não depende de UI)
- [ ] Camada server (`src/server/**`) com lógica de negócio + testes

## Backlog (Sprint 0 — Fundação, depois da aprovação)

- [ ] Criar repositório GitHub privado `vitrine-virtual`
- [ ] Inicializar Next.js 14 + TypeScript + Tailwind + shadcn/ui
- [ ] Configurar ESLint + Prettier + Husky + lint-staged
- [ ] Configurar Vitest + Testing Library + Playwright (skeleton)
- [ ] Configurar GitHub Actions (lint + typecheck + test)
- [ ] Configurar Supabase local via Docker
- [ ] Criar primeira migration (schema base: profiles, lojas, pecas, pecas_fotos, try_on_uses, system_settings)
- [ ] Criar `.env.example` com todas as variáveis documentadas
- [ ] README inicial do repo com "como rodar localmente"

## Backlog (Sprints 1–6)

- [ ] **Sprint 1 — Auth + Super-admin:** login, recuperação de senha, painel super-admin (criar loja, listar lojas), magic link de convite, RLS básica, profiles + roles
- [ ] **Sprint 2 — Peças:** CRUD completo, modal de cadastro/edição, upload com compressão, foto principal, marcar vendida, excluir com confirmação
- [ ] **Sprint 3 — Dashboard + listagem:** 5 indicadores, tela "Todas as peças" com ordenação, exportação CSV
- [ ] **Sprint 4 — Vitrine pública:** configurações da loja (logo, redes, WhatsApp, toggle de preço), `/v/[slug]`, `/v/[slug]/peca/[id]`, botão WhatsApp pré-preenchido
- [ ] **Sprint 5 — Provador IA:** edge function `/api/try-on`, FASHN + Replicate fallback, modal de upload, Turnstile, rate limit Upstash, cota mensal por loja, kill switch global, log sanitizado
- [ ] **Sprint 6 — QA + Deploy:** testes E2E críticos, ajustes de UX, deploy production, documentação final em `docs/`, política de privacidade, termos de uso

## Bloqueado / esperando

- [ ] (aguardando aprovação da Proposta Técnica v1 pelo Francisco)
- [ ] (aguardando criação das contas externas)
- [ ] (aguardando respostas das dúvidas A–F do README — não bloqueiam Sprint 0, mas precisam estar respondidas conforme cada sprint)

## Concluído (últimos 7 dias)

- [x] 2026-04-25 — Discovery inicial: 8 perguntas estruturadas para o cliente, todas respondidas
- [x] 2026-04-25 — [[notes/proposta-tecnica-v1|Proposta Técnica v1]] elaborada e entregue
- [x] 2026-04-25 — Estrutura do projeto criada no vault Obsidian
- [x] 2026-04-25 — ADRs 0001 a 0006 registrados

---
**Tags:** #projeto/vitrine-virtual #todo

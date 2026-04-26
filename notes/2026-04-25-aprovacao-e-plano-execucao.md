# Aprovação da proposta e plano de execução paralela ao designer

> Sessão de 25/04/2026 (logo após a entrega da proposta).

## O que aconteceu

- Cliente **aprovou todas as decisões** da [[proposta-tecnica-v1|Proposta Técnica v1]] sem ajustes.
- Cliente vai pedir as telas via **Claude Designer** em paralelo.
- Cliente me autorizou a desenvolver **tudo o que não envolve tela**, decidindo eu por onde começar.
- Acordo: cliente fica acompanhando e eu o aviso quando precisar de algo (acesso, decisão, conta externa).

## Análise: o que dá pra fazer sem telas

Revisando o escopo das 6 sprints contra a restrição "sem UI":

| Sprint | Parte sem UI (posso fazer agora) | Parte com UI (espera designer) |
|---|---|---|
| **0 — Fundação** | **100%** — repo, lint, format, CI, Supabase local, migrations vazias, .env.example, README, `docs/` | (nenhuma) |
| **1 — Auth + Super-admin** | Migrations + RLS policies (profiles, lojas), middleware de auth, server actions de criar loja, magic link, validators Zod, testes unitários | Páginas `/login`, `/recuperar`, `/admin/super/*`, formulário, layouts |
| **2 — Peças** | Migrations (pecas, pecas_fotos), API routes CRUD, lógica de upload com signed URLs, validators, testes | Páginas `/admin/pecas/*`, modais, cards, formulário |
| **3 — Dashboard + CSV** | API de métricas, geração de CSV server-side, testes | Tela do dashboard, tela "todas as peças", botão exportar |
| **4 — Vitrine pública + WhatsApp** | Funções `SECURITY DEFINER`, helper de link WhatsApp `wa.me`, server-side rendering data layer | Páginas `/v/[slug]`, `/v/[slug]/peca/[id]`, layout mobile-first |
| **5 — Provador IA** | Edge function `/api/try-on`, clientes FASHN/Replicate, orquestrador, rate limit Upstash, Turnstile verify, cota mensal, kill switch, log sanitizado, testes | Modal de upload de foto, tela de resultado |
| **6 — QA/Deploy/Docs** | Setup Playwright, scripts de smoke test, docs em `docs/**`, política de privacidade (texto), termos de uso (texto) | (nenhuma — testes E2E precisam das páginas existirem) |

**Estimativa:** consigo entregar ~70% do código do MVP **antes** das telas chegarem. Quando o designer entregar, é só plugar a UI nas APIs/server actions já testadas.

## Ordem de execução decidida

Vou seguir nesta ordem (cada item gera commit + atualização no [[todo]]):

1. **Sprint 0 — Fundação completa** (repo Next.js + TS + Tailwind + shadcn-cli config, lint, format, husky, vitest, playwright skeleton, github actions, supabase local com docker-compose, .env.example, docs iniciais)
2. **Schema do banco** — migrations SQL para profiles, lojas, pecas, pecas_fotos, try_on_uses, system_settings + **todas as RLS policies + função SECURITY DEFINER da vitrine pública** + índices + seed de dev
3. **Tipos TS gerados do schema** (Supabase gen types)
4. **Validators Zod** — schemas compartilhados front/back para loja, peca, try-on
5. **Camada server (`src/server/**`)** — casos de uso puros, isolados de Supabase via interface
   - `lojas/` — criar, atualizar, listar (super-admin)
   - `pecas/` — CRUD + transição de status + soft delete (decidir) ou hard delete + signed upload URL
   - `try-on/` — orquestrador FASHN/Replicate, anti-abuso (4 camadas)
   - `auth/` — helpers de sessão e role check
6. **API routes** correspondentes (`src/app/api/**`) — finas, só validam + chamam server
7. **Middleware de auth** (`src/middleware.ts`) — gating de rotas admin/super-admin
8. **Lib de export CSV** (`src/lib/csv/`)
9. **Lib de WhatsApp link** (`src/lib/whatsapp/`)
10. **Testes unitários** — vitest, alvo coverage ≥ 70% nas pastas `src/server/**` e `src/lib/**`
11. **Testes de integração** — RLS, anti-abuso, fluxo completo de try-on com mock do FASHN
12. **Documentação** — `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/SECURITY.md`, `docs/ENV.md`, `docs/PHOTO-GUIDELINES.md`

## Pendência operacional única

Preciso de uma **pasta no computador** para o código (separada do vault). Vou pedir via `request_cowork_directory` sugerindo `~/Documents/Vitrine Virtual`. Sem isso, posso só seguir criando markdown no vault, mas não código real.

## Avisos para o cliente quando relevantes

Vou avisar quando:
- Precisar que ele crie uma conta (Supabase em algum momento, FASHN para ligar IA real, etc.)
- Encontrar algo na implementação que mereça uma decisão
- Tiver bloqueio que não consigo resolver sem ele
- Cada sprint backend for concluída

---
**Tags:** #projeto/vitrine-virtual #sessao #2026-04-25

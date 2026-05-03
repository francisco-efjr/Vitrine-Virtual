# To-do — Vitrine Virtual

> Lista viva. Itens concluídos podem virar anotações em `notes/`.
> Última atualização: 2026-05-02 (recebida [[notes/2026-05-02-spec-produto-v2|Spec v2]])

## Próximo passo (P0)

- [x] Cliente aprovou a [[notes/proposta-tecnica-v1|Proposta Técnica v1]] em 25/04 — autorizou execução de TUDO que não envolve tela enquanto designer prepara as telas via Claude Designer
- [x] **02/05 — ADRs 0007–0011 da [[notes/2026-05-02-spec-produto-v2|Spec v2]] aprovados:**
  - [x] [[decisions/0007-url-publica-sem-prefixo-v|ADR 0007]] — URL pública sem `/v`
  - [x] [[decisions/0008-venda-por-tamanho|ADR 0008]] — Venda por tamanho (`peca_tamanhos`)
  - [x] [[decisions/0009-fundo-provador-configuravel|ADR 0009]] — Fundo configurável do provador
  - [x] [[decisions/0010-cabine-duas-fotos|ADR 0010]] — Cabine de 2 fotos (rosto + corpo)
  - [x] [[decisions/0011-nano-banana-substitui-fashn|ADR 0011]] — **Nano Banana** substitui FASHN/Replicate
- [ ] **Em andamento por mim:** Sprint 0 + camadas server-side de Sprints 1, 2 e 5 (sem UI)
- [ ] Cliente criar contas externas (não-bloqueante para Sprint 0 com Supabase local):
  - [x] Supabase (free tier) — configurado
  - [ ] Vercel (Hobby) — para deploy
  - [ ] ~~FASHN.ai~~ ~~Replicate~~ — substituídos por Nano Banana ([[decisions/0011-nano-banana-substitui-fashn|ADR 0011]])
  - [ ] **Google Cloud + Vertex AI (plano pago)** — para Nano Banana com não-retenção contratual
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

## 🆕 Refactors da Spec v2 (02/05)

> Ver [[notes/2026-05-02-spec-v2-vs-implementacao|diff completo]] e [[notes/spec/00-indice|índice da spec]].
> Cada item tem nota detalhada em `notes/spec/`.

### P0 — bloqueia o launch da v2 (DESBLOQUEADO em 02/05)

- [ ] **Spike Nano Banana** (1–2h): contrato Vertex AI sem retenção + 5 testes de qualidade ([[decisions/0011-nano-banana-substitui-fashn|ADR 0011]])
- [ ] **Refactor provider IA:** remover `fashn.ts` e `replicate.ts`; criar `src/lib/try-on/nano-banana/{client,prompt,types}.ts`; simplificar orchestrator ([[decisions/0011-nano-banana-substitui-fashn|ADR 0011]])
- [ ] **`.env.example` e secrets:** remover FASHN/Replicate, adicionar `GOOGLE_VERTEX_*`, `NANO_BANANA_MODEL`
- [ ] **Schema:** migration `peca_tamanhos` + trigger sync ([[notes/spec/08-tamanhos-multiplos-vendido|spec 08]] · [[decisions/0008-venda-por-tamanho|ADR 0008]])
- [ ] **Schema:** `categorias_padrao` global + seed inicial ([[notes/spec/02-vitrine-filtros-categoria|spec 02]])
- [ ] **Schema:** `lojas.tagline` + `lojas.storefront_visible` + `lojas.fitting_room_background_*` ([[notes/spec/09-config-loja-tela-unica|spec 09]] · [[notes/spec/10-fundo-provador|spec 10]])
- [ ] **Routing:** mover `/v/[slug]/*` → `/[slug]/*` + 301 redirect ([[notes/spec/11-url-publica-sem-v|spec 11]] · [[decisions/0007-url-publica-sem-prefixo-v|ADR 0007]])
- [ ] **Slug reservado:** estender lista em `_app/src/server/lojas/slug.ts`
- [ ] **Cabine 2 fotos:** refactor `/api/try-on` (4 imagens → Nano Banana) + `<TryOnModal>` 2 cards ([[notes/spec/05-cabine-duas-fotos|spec 05]] · [[decisions/0010-cabine-duas-fotos|ADR 0010]])
- [ ] **Cadastro de peça:** múltipla seleção de tamanho + categoria padrão (sem custom) ([[notes/spec/07-cadastro-peca-campos|spec 07]])
- [ ] **Modal "Vendido por tamanho":** componente novo `<VendidoModal>` + server action ([[notes/spec/08-tamanhos-multiplos-vendido|spec 08]])
- [ ] **Audit slug:** remover toda exibição do slug fora do super-admin ([[notes/spec/09-config-loja-tela-unica|spec 09]])

### P1 — UX da v2

- [ ] **Vitrine — drawer da peça (bottom sheet)** + manter rota deep-link fallback ([[notes/spec/03-vitrine-drawer-peca|spec 03]])
- [ ] **Vitrine — modos grade/foco** com toggle ([[notes/spec/01-vitrine-modos-grade-foco|spec 01]])
- [ ] **Vitrine — filtro por categoria** + busca por nome/categoria no admin ([[notes/spec/02-vitrine-filtros-categoria|spec 02]])
- [ ] **Padronização de imagens** — Supabase Transforms via helper `getPhotoUrl()` + cards aspect-ratio fixo ([[notes/spec/12-padronizacao-imagens|spec 12]])
- [ ] **Linguagem sem "IA" no front cliente** — audit de strings ([[notes/spec/13-linguagem-sem-ia|spec 13]])
- [ ] **Loading do provador sem porcentagem** + barra shimmer ([[notes/spec/06-cabine-loading-resultado|spec 06]])
- [ ] **Botão "Falar com a loja" mais discreto** na tela de resultado ([[notes/spec/06-cabine-loading-resultado|spec 06]])
- [ ] **Toggle `storefront_visible` na config** + 404 amigável quando off ([[notes/spec/09-config-loja-tela-unica|spec 09]])
- [ ] **Fundo configurável** — UI + bucket + composição server-side ([[notes/spec/10-fundo-provador|spec 10]] · [[decisions/0009-fundo-provador-configuravel|ADR 0009]])

### P2 — diferido

- [ ] Drag-and-drop para reordenar fotos da peça
- [ ] Lint rule `no-ai-in-public-strings`
- [ ] Audit log para ações de super-admin
- [ ] Subdomínio por loja (`atelier-laila.vitrine.app`) — só se tração justificar

### Auditoria não-funcional

- [ ] Confirmar que nenhum JSX herdado do designer ainda mostra cor/estado/descrição/reviews ([[notes/spec/04-vitrine-nao-ecommerce|spec 04]] · [[notes/spec/07-cadastro-peca-campos|spec 07]])
- [ ] Lighthouse run: LCP ≤ 2.5s · CLS < 0.05 ([[notes/spec/14-responsividade-performance-privacidade|spec 14]])
- [ ] Revisar `/privacidade` após implementar 2 fotos + fundo

## Bloqueado / esperando

- [ ] **Cliente criar conta Google Cloud + Vertex AI** com plano pago — única coisa que bloqueia o spike e o refactor do provider ([[decisions/0011-nano-banana-substitui-fashn|ADR 0011]])
- [ ] Spike Nano Banana só roda depois da conta criada
- [ ] (aguardando criação das demais contas externas — Vercel, Upstash, Cloudflare, Sentry)
- [ ] (aguardando respostas das dúvidas A–F do README — não bloqueiam Sprint 0, mas precisam estar respondidas conforme cada sprint)

## Concluído (últimos 7 dias)

- [x] 2026-05-02 — [[notes/2026-05-02-spec-produto-v2|Spec v2]] recebida do cliente, [[notes/2026-05-02-spec-v2-vs-implementacao|diff vs implementação]] elaborado
- [x] 2026-05-02 — 14 notas atômicas em `notes/spec/` cobrindo as regras novas/refinadas da v2
- [x] 2026-05-02 — ADRs 0007 a 0010 registrados, **aprovados pelo Francisco no fim do dia**
- [x] 2026-05-02 — ADR 0011 (Nano Banana / Gemini 2.5 Flash Image) criado e **aprovado** — substitui FASHN/Replicate
- [x] 2026-05-02 — Decisões de implementação fechadas: Supabase Transforms (imagens) + categoria padrão global
- [x] 2026-04-26 — Sprint 0 + camada server completa (ver [[notes/2026-04-26-daily|daily]])
- [x] 2026-04-25 — Discovery inicial: 8 perguntas estruturadas para o cliente, todas respondidas
- [x] 2026-04-25 — [[notes/proposta-tecnica-v1|Proposta Técnica v1]] elaborada e entregue
- [x] 2026-04-25 — Estrutura do projeto criada no vault Obsidian
- [x] 2026-04-25 — ADRs 0001 a 0006 registrados

---
**Tags:** #projeto/vitrine-virtual #todo

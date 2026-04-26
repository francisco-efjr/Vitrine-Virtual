# Proposta Técnica Inicial — Vitrine Virtual (MVP)

**Documento para aprovação do cliente antes da implementação.**
Versão 1.0 · 25/04/2026

---

## 1. Resumo executivo

O Vitrine Virtual é um SaaS multi-loja para divulgação de roupas com provador virtual por IA. O MVP será construído sobre **Supabase + Next.js 14 + Vercel**, com **FASHN.ai** como provedor de virtual try-on, isolamento de dados por loja via **Row Level Security (RLS)** do PostgreSQL, e quatro camadas de proteção contra abuso da IA paga (rate limit, cota mensal, CAPTCHA invisível e kill switch global).

A meta é entregar um MVP funcional, seguro, testável e com deploy online em **6 sprints curtas (~3 semanas de execução real)**, mantendo custo de infraestrutura próximo de zero até começar a haver tráfego real, e custo de IA limitado a um teto mensal definido por você.

---

## 2. Decisões já fechadas (recap das suas respostas)

| Tema | Decisão |
|---|---|
| Stack base | Supabase + Next.js + Vercel |
| Provador IA | API paga já no MVP, teto US$ 0,15/geração |
| Onboarding das lojas | Manual, via painel super-admin no próprio app |
| Geografia | Brasil somente (LGPD aplicável) |
| Anti-abuso da IA | Rate limit por IP + cota mensal por loja + CAPTCHA Turnstile + kill switch global |
| Contas já existentes | GitHub |

---

## 3. Stack recomendada (justificada)

| Camada | Escolha | Por quê |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) + TypeScript + Tailwind CSS | Renderização híbrida (SSR para vitrine pública = bom SEO; CSR para painel admin = boa UX). TypeScript reduz bugs em produção. |
| **UI primitives** | shadcn/ui + Radix | Componentes acessíveis (WCAG AA), sem lock-in (código fica no projeto), visual minimalista alinhado ao brief. |
| **Auth** | Supabase Auth | E-mail/senha, confirmação de e-mail, recuperação de senha, JWT pronto, integra nativamente com RLS. Zero código de auth próprio. |
| **Banco** | Supabase PostgreSQL | SQL maduro, RLS para multi-tenant seguro, exportação CSV trivial, migrations versionadas. |
| **Storage** | Supabase Storage | Bucket por loja com policies, signed URLs para fotos privadas, URLs públicas para vitrine. |
| **Provador IA** | FASHN.ai (primário) + Replicate IDM-VTON (fallback) | FASHN: ~US$ 0,04–0,08/geração, qualidade comercial, latência 5–15s, REST limpa. Replicate como plano B se FASHN cair. |
| **Rate limit** | Upstash Redis (free tier) | Edge-compatible, integra com Vercel Edge Functions. 10k requests/dia grátis. |
| **CAPTCHA** | Cloudflare Turnstile | Invisível, gratuito, sem GDPR/LGPD complexo. |
| **Hospedagem** | Vercel | Deploy automático via GitHub, preview por branch, edge functions, free tier suficiente. |
| **E-mail transacional** | Supabase Auth (built-in) → migrar para Resend depois | Para MVP, e-mails de confirmação e recuperação do Supabase bastam. Resend entra quando quisermos personalizar templates. |
| **Validação** | Zod | Schema único compartilhado entre frontend e API. |
| **Testes** | Vitest + Testing Library + Playwright | Vitest = rápido, Vite-native. Playwright só para smoke E2E do fluxo crítico. |
| **Lint/Format** | ESLint + Prettier + Husky + lint-staged | Quality gate local antes do commit. |
| **CI/CD** | GitHub Actions + Vercel | Lint + typecheck + test em PR. Merge em `main` → deploy production automático. |
| **Observabilidade** | Vercel Analytics + Sentry (free tier) | Erros e performance sem custo no início. |

**Custo mensal estimado até 1.000 try-ons/mês:** US$ 30–80 (tudo somado, com folga). Detalhado na seção 16.

---

## 4. Arquitetura geral

```
┌─────────────────────────────────────────────────────────────┐
│                         NAVEGADOR                           │
│   ┌──────────────┐   ┌───────────────┐   ┌──────────────┐   │
│   │ Vitrine pub. │   │ Painel loja   │   │ Super-admin  │   │
│   │  (mobile)    │   │  (responsivo) │   │  (Francisco) │   │
│   └──────┬───────┘   └───────┬───────┘   └──────┬───────┘   │
└──────────┼───────────────────┼──────────────────┼───────────┘
           │ HTTPS             │ HTTPS            │ HTTPS
           ▼                   ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS @ VERCEL                         │
│  Server Components (SSR) + Route Handlers (API)             │
│  Middleware: auth check + rate limit + Turnstile verify     │
└──────────┬───────────────────┬──────────────────┬───────────┘
           │                   │                  │
           ▼                   ▼                  ▼
   ┌──────────────┐    ┌──────────────┐   ┌──────────────┐
   │   Supabase   │    │   Upstash    │   │  FASHN.ai    │
   │  Postgres    │    │    Redis     │   │   (try-on)   │
   │  + Auth      │    │ (rate limit) │   └──────────────┘
   │  + Storage   │    └──────────────┘
   │  + RLS       │
   └──────────────┘
```

**Princípios:**
- Painel admin → autenticado, **client + RLS** (cliente Supabase no browser respeita policies).
- Vitrine pública → SSR usando **service role apenas em rotas filtradas por slug**, nunca expondo dados sensíveis.
- API de try-on → roda em **Edge Function** (latência baixa para upload de foto), foto **nunca** persistida.

---

## 5. Modelo de dados

```sql
-- USUÁRIOS (gerenciado pelo Supabase Auth)
auth.users
  id, email, encrypted_password, email_confirmed_at, ...

-- METADADOS DE PERFIL (extensão de auth.users)
public.profiles
  id              uuid pk references auth.users(id)
  role            text default 'lojista'  -- 'lojista' | 'super_admin'
  created_at      timestamptz

-- LOJAS
public.lojas
  id                      uuid pk default gen_random_uuid()
  owner_user_id           uuid unique references auth.users(id)
  slug                    text unique           -- /v/:slug
  nome                    text not null
  logo_url                text
  instagram               text
  tiktok                  text
  whatsapp_e164           text                   -- +5511999999999
  exibir_preco_publico    boolean default false
  cota_try_on_mensal      int default 200
  created_at, updated_at  timestamptz

-- PEÇAS
public.pecas
  id                  uuid pk
  loja_id             uuid references lojas(id) on delete cascade
  nome                text not null check (length(nome) <= 100)
  preco_centavos      int                       -- evita float
  tamanho             text
  status              text default 'disponivel' check (status in ('disponivel','vendida'))
  foto_principal_id   uuid references pecas_fotos(id)
  vendida_em          timestamptz
  created_at, updated_at

-- FOTOS DAS PEÇAS
public.pecas_fotos
  id              uuid pk
  peca_id         uuid references pecas(id) on delete cascade
  storage_path    text not null     -- caminho no bucket
  ordem           int default 0
  created_at

-- LOG DE USO DO PROVADOR (para cota e auditoria)
public.try_on_uses
  id                    uuid pk
  loja_id               uuid references lojas(id)
  peca_id               uuid references pecas(id)
  ip_hash               text         -- SHA-256(ip + salt), nunca IP cru
  session_id            text         -- cookie de sessão anônimo
  created_at            timestamptz
  success               boolean
  provider              text         -- 'fashn' | 'replicate'
  provider_request_id   text
  error_code            text

-- CONFIGURAÇÕES GLOBAIS DO SISTEMA (kill switch, etc.)
public.system_settings
  key       text pk      -- ex: 'try_on_enabled', 'try_on_monthly_budget_usd'
  value     jsonb
  updated_at, updated_by
```

**Decisões importantes do schema:**
- `preco_centavos` (int) em vez de `preco` (decimal) → evita problemas de ponto flutuante.
- `slug` na tabela `lojas` → URL pública estável mesmo se a loja mudar de nome.
- `ip_hash` em vez de IP cru → conformidade LGPD (IP é dado pessoal).
- `on delete cascade` em `pecas_fotos` → não deixa lixo no banco quando peça é excluída (storage também é limpo via trigger).

---

## 6. Multi-tenancy via RLS

Toda tabela com `loja_id` ganha policies como:

```sql
-- Lojista só lê suas próprias peças
create policy "lojistas_select_own_pecas" on pecas
for select using (
  loja_id in (select id from lojas where owner_user_id = auth.uid())
);

-- Lojista só escreve nas suas próprias peças
create policy "lojistas_insert_own_pecas" on pecas
for insert with check (
  loja_id in (select id from lojas where owner_user_id = auth.uid())
);

-- Vitrine pública: select via função SECURITY DEFINER que filtra por slug
-- (não expõe a tabela diretamente para anon)
```

**Resultado:** Mesmo que um bug deixe um endpoint sem auth check, o banco recusa retornar dados de outra loja. Isolamento por defesa em profundidade.

---

## 7. Autenticação

| Fluxo | Implementação |
|---|---|
| Login | E-mail + senha via Supabase Auth |
| Cadastro de loja | **Manual via painel super-admin** (você cria a loja e gera convite) |
| Convite enviado para o lojista | Magic link de "definir senha" do Supabase (e-mail automático) |
| Confirmação de e-mail | Built-in do Supabase |
| Recuperação de senha | Built-in do Supabase |
| Logout | `supabase.auth.signOut()` |
| Sessão | JWT em cookie httpOnly, renovação automática |
| Super-admin | Whitelist de e-mails em variável de ambiente `SUPER_ADMIN_EMAILS` + role na tabela `profiles` |

**Sem login social no MVP** (conforme brief).

---

## 8. Storage

- **Bucket privado** `pecas-fotos`: organizado como `{loja_id}/{peca_id}/{uuid}.jpg`.
- **Policy** que só permite upload/delete pelo dono da loja.
- **Signed URLs** com TTL de 1h para o painel admin.
- **URLs públicas** (via CDN do Supabase) só para fotos de peças pertencentes a vitrines públicas.
- **Validação no upload:**
  - Tipos aceitos: `image/jpeg`, `image/png`, `image/webp`.
  - Tamanho máximo: 5 MB por foto.
  - Máximo 8 fotos por peça.
  - Compressão client-side antes do upload (browser-image-compression) para economizar banda.

---

## 9. Provador virtual com IA

### 9.1 Comparativo de provedores avaliados

| Provedor | Custo/geração | Latência | Qualidade | Notas |
|---|---|---|---|---|
| **FASHN.ai** ⭐ | US$ 0,04–0,08 | 5–10s | Alta, comercial | REST simples, docs claras, sem mínimo mensal. **Recomendado.** |
| Kling AI | US$ 0,10–0,15 | 8–15s | Muito alta | Provedor chinês — risco de instabilidade e dúvida regulatória no BR. |
| Replicate (IDM-VTON) | US$ 0,02–0,05 | 20–40s | Média–alta | Mais barato, mas latência alta. **Bom como fallback.** |
| Pixelcut | US$ 0,08–0,12 | 5–10s | Alta | Boa qualidade, mas API menos madura. |
| Google Vertex AI VTO | US$ 0,30+ | 5–10s | Topo | Acima do nosso teto orçado. |

**Recomendação:** FASHN.ai como primário, Replicate IDM-VTON como fallback automático em caso de erro/timeout. Ambos dentro do teto US$ 0,15.

### 9.2 Fluxo

1. Cliente final clica em "Provar virtualmente" na vitrine.
2. Modal abre com opção: **Tirar foto** (câmera) ou **Enviar foto** (galeria).
3. Frontend valida foto (tipo, tamanho, no mínimo 256×256 px).
4. Frontend gera **token Turnstile** (CAPTCHA invisível).
5. POST `/api/try-on` com: token Turnstile, peca_id, foto (multipart).
6. Edge function:
   a. Verifica Turnstile.
   b. Verifica `system_settings.try_on_enabled` (kill switch).
   c. Verifica rate limit por IP no Upstash.
   d. Verifica cota mensal da loja.
   e. Chama FASHN.ai com a foto + URL da foto principal da peça.
   f. Retorna URL temporária do resultado para o cliente.
   g. Loga o uso (sem armazenar a foto).
7. Cliente vê resultado + botão WhatsApp.

### 9.3 Privacidade da foto do cliente final

**Nunca persistimos a foto do cliente.** Concretamente:

- A foto chega como `multipart/form-data` na edge function.
- É lida em buffer de memória.
- É enviada para o FASHN.ai (que tem política de retenção de 30 dias por padrão — vamos solicitar opt-out de retenção via header `X-No-Retention: true`, suportado pelo plano deles).
- Não escrevemos no Supabase Storage, nem em log, nem em variável que dure mais que o request.
- Após responder ao cliente, o buffer é descartado pelo garbage collector.
- O resultado retornado é uma URL temporária do FASHN (TTL ~24h) — não copiamos para nosso storage.

Isso é documentado na **Política de Privacidade pública** que viverá em `/privacidade`.

### 9.4 Anti-abuso (4 camadas conforme sua escolha)

| Camada | Implementação | Limite default |
|---|---|---|
| 1. Cloudflare Turnstile | Token validado server-side antes de chamar IA | — |
| 2. Rate limit por IP | Upstash Redis, sliding window | 5/h, 20/dia, 50/semana por IP |
| 3. Cota mensal por loja | Query em `try_on_uses` antes de cada chamada | 200/mês (configurável por loja) |
| 4. Kill switch global | Flag em `system_settings` + cron diário que checa gasto | Default ON, desliga ao atingir `try_on_monthly_budget_usd` |

A loja vê o saldo de cota no dashboard. Quando a cota acaba, o cliente final vê: *"O provador desta loja atingiu o limite mensal. Volte em [data]."*

---

## 10. Privacidade e LGPD

- **Página `/privacidade`** com política em PT-BR cobrindo: dados coletados, finalidade, base legal (legítimo interesse + consentimento), retenção, direitos do titular, contato do controlador.
- **Banner de cookies** mínimo (só essenciais — nada de Google Analytics no MVP).
- **Logs sanitizados:** nunca logamos e-mail, senha, IP cru, foto. Apenas `user_id`, `loja_id`, `request_id`.
- **Consentimento explícito** antes de o cliente final enviar foto: checkbox "Concordo com o uso da minha foto para gerar a simulação. Ela não será armazenada."
- **Direito de exclusão da loja:** rota `/admin/excluir-conta` que deleta tudo (RLS + cascade) — atendendo LGPD.
- **Variáveis sensíveis** (chaves API, service role do Supabase) só em Vercel Environment Variables, nunca no repo. `.env.example` no repo só com placeholders.
- **OWASP Top 10** coberto via: Zod (validação), parametrized queries (Supabase client), CSP headers (next.config.js), helmet equivalent, JWT rotation (Supabase nativo).

---

## 11. Estrutura de pastas

```
vitrine-virtual/
├── .github/workflows/ci.yml           # lint + typecheck + test em PR
├── .husky/                            # hooks pre-commit
├── public/                            # estáticos
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── (auth)/                    # rotas de auth (login, recuperar)
│   │   ├── (admin)/                   # painel da loja (protegido)
│   │   │   ├── dashboard/
│   │   │   ├── pecas/                 # peças disponíveis
│   │   │   ├── todas-pecas/
│   │   │   └── configuracoes/
│   │   ├── (super-admin)/             # painel do Francisco
│   │   │   └── lojas/
│   │   ├── (public)/
│   │   │   ├── v/[slug]/              # vitrine pública
│   │   │   │   ├── page.tsx
│   │   │   │   └── peca/[pecaId]/page.tsx
│   │   │   ├── privacidade/
│   │   │   └── termos/
│   │   ├── api/
│   │   │   ├── pecas/                 # CRUD peças
│   │   │   ├── try-on/                # Edge Function IA
│   │   │   ├── upload/                # signed upload URLs
│   │   │   └── super-admin/lojas/
│   │   ├── layout.tsx
│   │   └── page.tsx                   # landing page do produto
│   ├── components/
│   │   ├── ui/                        # primitives (shadcn)
│   │   ├── admin/                     # SidebarNav, PecaCard, PecaFormModal
│   │   ├── public/                    # VitrineGrid, TryOnModal, WhatsAppButton
│   │   └── shared/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # browser client
│   │   │   ├── server.ts              # server (RSC) client
│   │   │   ├── service.ts             # service role (apenas server)
│   │   │   └── middleware.ts
│   │   ├── try-on/
│   │   │   ├── fashn.ts               # provider primário
│   │   │   ├── replicate.ts           # fallback
│   │   │   └── orchestrator.ts        # tenta primário, cai para fallback
│   │   ├── rate-limit/
│   │   │   └── upstash.ts
│   │   ├── turnstile/
│   │   ├── validators/                # zod schemas (peca, loja, try-on)
│   │   ├── csv/                       # geração CSV
│   │   └── utils/
│   ├── server/                        # casos de uso (lógica de negócio)
│   │   ├── pecas/
│   │   ├── lojas/
│   │   ├── try-on/
│   │   └── auth/
│   ├── types/                         # tipos TS gerados do schema Supabase
│   ├── middleware.ts                  # auth check global
│   └── styles/globals.css
├── supabase/
│   ├── migrations/                    # SQL versionado
│   ├── seed.sql                       # dados de dev
│   └── config.toml
├── tests/
│   ├── unit/                          # casos de uso, validators, utils
│   ├── integration/                   # rotas API com Supabase local
│   └── e2e/                           # Playwright (smoke do fluxo)
├── docs/
│   ├── README.md                      # overview + como rodar
│   ├── ARCHITECTURE.md
│   ├── DATA-MODEL.md
│   ├── SECURITY.md
│   ├── DEPLOY.md
│   ├── ENV.md
│   ├── TESTING.md
│   └── PHOTO-GUIDELINES.md            # como a loja deve fotografar peças
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── README.md
```

---

## 12. Estratégia de testes e quality gate

| Tipo | Ferramenta | Onde | Cobertura mínima |
|---|---|---|---|
| Unit | Vitest | `src/server/**`, `src/lib/**` | **70%** linhas |
| Component | Vitest + Testing Library | `src/components/**` | smoke de cada modal |
| Integration | Vitest + Supabase local | `src/app/api/**` | rotas críticas (peças, try-on) |
| E2E | Playwright | `tests/e2e/` | 1 fluxo completo (cadastro de peça → publicação → try-on) |

**Quality gate (executado no `pre-commit` e na CI):**
1. `pnpm lint` (ESLint, zero warnings)
2. `pnpm typecheck` (tsc --noEmit)
3. `pnpm test --coverage` (Vitest, falha se < 70%)
4. `pnpm test:e2e` (apenas na CI, em PR)

PR só é mergeable se as 4 etapas passarem. Configurado via branch protection no GitHub.

---

## 13. CI/CD e deploy

### Pipeline (GitHub Actions, `.github/workflows/ci.yml`)

```
push em qualquer branch
  ├── lint
  ├── typecheck
  ├── unit + integration tests
  └── coverage check (>= 70%)

PR para main
  └── + e2e (Playwright em headless)

merge em main
  └── Vercel deploy automático para production
```

### Ambientes

| Ambiente | URL | Banco | Quando |
|---|---|---|---|
| **local** | http://localhost:3000 | Supabase local (Docker) | desenvolvimento |
| **preview** | `*-vitrine.vercel.app` | Supabase staging | cada PR |
| **production** | `vitrinevirtual.com.br` (ou `*.vercel.app` no início) | Supabase produção | merge em main |

### Estratégia de rollback

Vercel mantém histórico de deploys. Rollback = um clique no painel Vercel ou `vercel rollback` na CLI. Migrations de banco são forward-only com plano de reversão documentado em cada migration.

---

## 14. Variáveis de ambiente

`.env.example` no repo:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server-only, nunca expor

# FASHN.ai
FASHN_API_KEY=
FASHN_API_BASE_URL=https://api.fashn.ai/v1

# Replicate (fallback)
REPLICATE_API_TOKEN=

# Upstash Redis (rate limit)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Super-admin (você)
SUPER_ADMIN_EMAILS=francisco.efjr@gmail.com

# Hashing IP (LGPD)
IP_HASH_SALT=                        # gerar com openssl rand -hex 32

# Sentry (observabilidade)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# Kill switch
TRY_ON_MONTHLY_BUDGET_USD=100        # ajustável a qualquer momento
```

---

## 15. Riscos técnicos e mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| 1 | API de IA cair ou degradar | Média | Alto | Fallback automático para Replicate; mensagem amigável se ambos falharem. |
| 2 | Conta de IA estourar orçamento | Baixa | Alto | Kill switch global + cota por loja + rate limit por IP. |
| 3 | RLS mal configurado vazar dados entre lojas | Baixa | **Crítico** | Testes de integração específicos para isolamento; revisão manual de cada policy. |
| 4 | Foto do cliente final salva por engano | Baixa | **Crítico (LGPD)** | Code review focado nessa rota; teste E2E que verifica que `pecas-fotos` bucket não recebe upload de try-on. |
| 5 | Custo do Supabase explodir com fotos grandes | Média | Médio | Compressão client-side antes do upload (target ≤ 300 KB/foto); limite de 8 fotos/peça. |
| 6 | Provador IA com qualidade baixa em fotos ruins | Alta | Médio | Documentar `PHOTO-GUIDELINES.md`; mostrar exemplos no painel de cadastro. |
| 7 | LGPD: pedido de exclusão sem rota | Baixa | Médio | Rota `/admin/excluir-conta` desde o MVP. |
| 8 | Vendor lock-in no Supabase | Baixa | Médio | Camada de acesso a dados em `src/server/**` isola Supabase do resto do código → migração para Postgres puro é viável. |

---

## 16. O que você precisa providenciar antes de começar

| # | Conta/Recurso | Custo | Link | Por quê |
|---|---|---|---|---|
| 1 | **Supabase** (free tier) | US$ 0 | supabase.com | Banco, auth, storage |
| 2 | **Vercel** (Hobby) | US$ 0 | vercel.com | Hospedagem |
| 3 | **FASHN.ai** | US$ 10 de créditos pré-pagos para começar | fashn.ai/api | API de virtual try-on |
| 4 | **Replicate** | US$ 5 de créditos pré-pagos (fallback) | replicate.com | Fallback de IA |
| 5 | **Upstash** (free tier) | US$ 0 | upstash.com | Rate limit Redis |
| 6 | **Cloudflare** (free tier) | US$ 0 | cloudflare.com | Turnstile (CAPTCHA) |
| 7 | **Sentry** (free tier — 5k errors/mo) | US$ 0 | sentry.io | Erros em produção |
| 8 | **Domínio** (opcional no MVP) | ~R$ 40/ano | registro.br | URLs profissionais. **Sem isso, começamos com `vitrine-virtual.vercel.app`.** |

**Custo total para rodar o MVP no primeiro mês:** ~US$ 15 (créditos pré-pagos de IA), assumindo até ~150 try-ons reais. Tudo o resto está em free tier.

---

## 17. Etapas de entrega (sprints)

Cada sprint termina com código mergeado em `main` + deploy preview funcionando.

| Sprint | Entregas | Duração estimada |
|---|---|---|
| **0 — Fundação** | Repo, estrutura de pastas, lint, format, husky, CI básica, Supabase local rodando, esqueleto Next.js, README inicial, `.env.example`. | 2 dias |
| **1 — Auth + Super-admin** | Login/logout, recuperação de senha, painel super-admin (criar loja, listar lojas, gerar convite), profiles + roles, RLS policies básicas. | 3 dias |
| **2 — Peças (CRUD + upload)** | Tela "Peças disponíveis", modal de cadastro/edição, upload de fotos com compressão, definição de foto principal, marcar vendida, excluir com confirmação. | 3 dias |
| **3 — Dashboard + listagem geral + CSV** | Dashboard com 5 indicadores, tela "Todas as peças" com ordenação, exportação CSV. | 2 dias |
| **4 — Configurações + Vitrine pública** | Tela de configurações da loja (logo, redes, WhatsApp, toggle de preço), página `/v/[slug]` mobile-first, página `/v/[slug]/peca/[id]`, botão WhatsApp com mensagem pré-preenchida. | 3 dias |
| **5 — Provador virtual com IA** | Edge function `/api/try-on`, integração FASHN + Replicate fallback, modal de upload de foto no cliente final, Turnstile, rate limit Upstash, cota mensal, kill switch, log sanitizado. | 4 dias |
| **6 — QA, polish, deploy, docs** | Testes E2E do fluxo crítico, ajustes de UX, deploy em produção, documentação final (`docs/`), política de privacidade, página de termos, smoke test pós-deploy. | 3 dias |

**Total: ~20 dias úteis de execução real (≈ 4 semanas de calendário).**

---

## 18. Dúvidas remanescentes (não bloqueiam, mas vou precisar antes das sprints indicadas)

| # | Pergunta | Quando preciso |
|---|---|---|
| A | Qual o **slug das primeiras 1–3 lojas** que você quer cadastrar? (Vai virar `/v/nome-da-loja`.) | Sprint 1 |
| B | Quer **logo do produto Vitrine Virtual** + favicon, ou seguimos com placeholder neutro no MVP? | Sprint 4 |
| C | A mensagem pré-preenchida do botão WhatsApp deve mencionar o nome da peça? Ex: *"Olá! Vi a peça [Nome] na sua vitrine e gostaria de mais informações."* | Sprint 4 |
| D | Quer um **e-mail customizado** de convite/recuperação (com seu logo) ou pode ser o template padrão do Supabase no MVP? | Sprint 1 |
| E | Vamos comprar o **domínio** agora ou começamos com `*.vercel.app`? | Sprint 6 |
| F | A **política de privacidade** vai ter um responsável (controlador) — que e-mail/CNPJ você quer expor? | Sprint 6 |

---

## 19. O que NÃO está no MVP (deixado explícito)

Conforme brief, ficam fora desta entrega:
- Estoque, categoria, cor, descrição da peça
- Múltiplos perfis de usuário por loja
- Pagamento online, carrinho, checkout
- Cadastro do cliente final
- Histórico de provas virtuais
- Login social
- App mobile nativo
- Internacionalização (i18n)
- Notificações por push/e-mail para a loja sobre engajamento
- Analytics avançado por peça (visualizações, cliques no WhatsApp)

Tudo isso é **possível como evolução pós-MVP** e a arquitetura proposta não impede.

---

## 20. Próximos passos

**O que preciso de você agora:**

1. **Aprovação desta proposta** (ou pedidos de ajuste) — em especial confirmar:
   - Stack e arquitetura
   - Modelo de dados
   - Estratégia do provador IA (FASHN + Replicate fallback)
   - 4 camadas anti-abuso
   - Estrutura de sprints
2. **Criação das contas listadas na seção 16** (posso te guiar passo a passo se quiser).
3. **Resposta às dúvidas A–F da seção 18** quando estiver tranquilo (não bloqueiam o início).

**Assim que tiver o "ok"**, eu sigo para a **Sprint 0 — Fundação**: monto a estrutura completa do projeto, configuro Supabase local, lint, CI, e te entrego um repositório rodando para você acompanhar a evolução por sprint.

---

*Documento gerado para aprovação. Qualquer item desta proposta pode ser ajustado antes da execução.*

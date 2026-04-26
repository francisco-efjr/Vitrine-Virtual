# Vitrine Virtual

SaaS multi-loja de vitrine online para lojas de roupas, com **provador virtual por IA** e contato direto via WhatsApp.

> Para visão de produto, ADRs e proposta técnica, ver o vault Obsidian em `Claude's Brain/01-Projects/vitrine-virtual/`.

---

## Stack

- **Next.js 14** (App Router) + **TypeScript** strict
- **Tailwind CSS** + tokens do design entregue (Cormorant Garamond + DM Sans, paleta off-white/ouro-taupe)
- **Supabase** — Postgres + Auth + Storage + RLS
- **FASHN.ai** (provider primário) + **Replicate** (fallback) para o provador IA
- **Upstash Redis** — rate limit por IP
- **Cloudflare Turnstile** — CAPTCHA invisível
- **Vitest** + **Playwright** — testes (coverage gate em 70%)
- **pnpm** + **Husky** + **lint-staged** — DX

---

## Como rodar localmente

### 1. Pré-requisitos

- **Node 20+** (`node --version`)
- **pnpm 9+** (`npm i -g pnpm`)
- **Git**

### 2. Instalar dependências

```bash
pnpm install
```

### 3. Configurar variáveis de ambiente

Copie o template:

```bash
cp .env.example .env.local
```

E preencha. **Mínimo necessário para o app subir** (todo o resto pode ficar em branco que cai em modo dev):

```bash
# === OBRIGATÓRIOS ===
NEXT_PUBLIC_SUPABASE_URL=https://tfylrbxajzmhsdnynpbx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<pega no Supabase dashboard → Settings → API>
SUPABASE_SERVICE_ROLE_KEY=<pega no Supabase dashboard → Settings → API → service_role (secret)>

SUPER_ADMIN_EMAILS=francisco.efjr@gmail.com
IP_HASH_SALT=<gere com: openssl rand -hex 32>

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Importante:** o `SUPABASE_SERVICE_ROLE_KEY` é secreto — **nunca commitar**. Já está no `.gitignore` via `.env.local`.

#### Variáveis opcionais (recursos avançados)

| Bloco | Necessário para | Sem ela acontece o quê |
|---|---|---|
| `FASHN_API_KEY` + `REPLICATE_API_TOKEN` | Provador IA funcionar | Botão "Provar" retorna erro 502 |
| `UPSTASH_REDIS_REST_URL` + `_TOKEN` | Rate limit por IP no provador | Sem rate limit (libera, mas loga warning) |
| `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | CAPTCHA no provador | Token "dev-bypass" é aceito |
| `NEXT_PUBLIC_SENTRY_DSN` | Erros em produção | Erros só vão no console |

### 4. Subir o servidor

```bash
pnpm dev
```

Abra **http://localhost:3000**.

### 5. Criar seu primeiro usuário super-admin (para acessar `/admin/super`)

Como o cadastro público está desabilitado (decisão de produto — onboarding manual via super-admin), você precisa criar o primeiro usuário direto no Supabase Studio:

1. Acesse https://supabase.com/dashboard/project/tfylrbxajzmhsdnynpbx/auth/users
2. Clique **"Add user"** → **"Create new user"**
3. Use o e-mail listado em `SUPER_ADMIN_EMAILS` (ex: `francisco.efjr@gmail.com`)
4. Defina uma senha qualquer
5. Marque **"Auto Confirm User"**
6. Volte ao SQL Editor e rode:

```sql
update public.profiles
set role = 'super_admin'
where id = (select id from auth.users where email = 'francisco.efjr@gmail.com');
```

Pronto. Agora você pode logar em `/login` e acessar `/admin/super` para criar lojas.

---

## Scripts úteis

| Comando | O que faz |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento (hot reload) |
| `pnpm build` | Build de produção |
| `pnpm start` | Roda o build de produção |
| `pnpm lint` | ESLint, falha em qualquer warning |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm format` | Prettier write |
| `pnpm format:check` | Prettier check (CI) |
| `pnpm test` | Testes unit/integration (Vitest, run-once) |
| `pnpm test:watch` | Testes em watch mode |
| `pnpm test:coverage` | Testes com coverage gate (≥70% em `src/server/**` e `src/lib/**`) |
| `pnpm test:e2e` | Playwright |
| `pnpm qa` | lint + typecheck + test:coverage (rode antes de commitar) |
| `pnpm supabase:types` | Regenera `src/types/database.ts` a partir do schema |

---

## Estrutura

```
src/
├── app/                          # Next.js App Router
│   ├── (admin)/                  # Painel da loja (protegido)
│   │   └── admin/
│   │       ├── dashboard/
│   │       ├── pecas/            # peças disponíveis (com modal CRUD)
│   │       ├── todas-pecas/      # todas + exportar CSV
│   │       ├── configuracoes/
│   │       └── super/            # super-admin (gestão de lojas + kill switch)
│   ├── api/
│   │   ├── auth/{callback,sign-out}/
│   │   ├── dashboard/
│   │   ├── loja/                 # GET/PATCH da própria loja
│   │   ├── pecas/                # CRUD de peças + fotos + export CSV
│   │   ├── super-admin/          # /lojas, /settings
│   │   └── try-on/               # provador IA (Edge runtime, Node)
│   ├── login/
│   ├── privacidade/
│   ├── termos/
│   ├── v/[slug]/                 # vitrine pública
│   │   └── peca/[pecaId]/
│   ├── layout.tsx                # fonts + globals
│   └── page.tsx                  # landing
├── components/
│   ├── brand/vv-logo.tsx
│   ├── public/{try-on-button, try-on-modal}.tsx
│   └── ui/{button, badge, card, input, modal, spinner, toggle}.tsx
├── lib/
│   ├── api/response.ts           # handleRoute wrapper para API routes
│   ├── csv/export.ts
│   ├── env.ts                    # validação Zod das env vars
│   ├── logger.ts                 # logger sanitizado (LGPD)
│   ├── security/ip-hash.ts       # SHA-256+salt para LGPD
│   ├── supabase/{client,server,service,middleware}.ts
│   ├── try-on/{fashn,replicate,orchestrator,rate-limit,turnstile,kill-switch}.ts
│   ├── utils.ts                  # cn() helper
│   ├── validators/{loja,peca,try-on}.ts (Zod, com testes)
│   └── whatsapp/link.ts
├── server/                       # Casos de uso (server-only)
│   ├── auth/session.ts
│   ├── lojas/{create,update,list,slug,errors}.ts
│   ├── pecas/{crud,fotos,dashboard,export-csv,errors}.ts
│   └── try-on/{quota,use-case}.ts
├── middleware.ts                 # auth check + super-admin gating
└── types/database.ts             # gerado via `pnpm supabase:types`

supabase/
├── config.toml                   # CLI local
├── migrations/                   # 5 arquivos SQL versionados
└── seed.sql                      # dados de dev (vazio em prod)

tests/
├── unit/                         # Vitest (rodando)
├── integration/                  # placeholder
└── e2e/                          # Playwright
```

---

## Banco de dados

Todas as 5 migrations já estão aplicadas no projeto Supabase `tfylrbxajzmhsdnynpbx` (us-east-1). Para um setup limpo do zero, basta rodar via Supabase CLI:

```bash
supabase link --project-ref tfylrbxajzmhsdnynpbx
supabase db push
```

**Tabelas:** `profiles`, `lojas`, `pecas`, `pecas_fotos`, `try_on_uses`, `system_settings` — todas com RLS.

**Funções públicas (anon):** `get_vitrine_publica`, `get_pecas_publicas`, `get_peca_publica`, `try_on_uso_mes_atual`, `is_super_admin`, `current_user_loja_id`.

**Buckets de storage:** `pecas-fotos` (privado, 5 MB) e `lojas-logos` (público, 2 MB).

---

## Segurança e privacidade (resumo)

- **Multi-tenancy via RLS** — uma loja jamais lê/escreve dados de outra, mesmo com bug de endpoint.
- **LGPD** — IP do cliente final é hasheado (`ip_hash`), nunca logado em claro.
- **Foto do cliente final no provador IA** — vive apenas em memória durante o request, descartada após. `X-No-Retention: true` enviado para FASHN.
- **4 camadas anti-abuso** no provador IA: Turnstile → Rate limit IP → Cota mensal por loja → Kill switch global.
- **Service role** isolada em `src/lib/supabase/service.ts` com `import 'server-only'`.

Detalhes nos ADRs (vault Obsidian: `Claude's Brain/01-Projects/vitrine-virtual/decisions/`).

---

## CI/CD

GitHub Actions em `.github/workflows/ci.yml`:
- **Quality gate** (lint + typecheck + format check + test:coverage com gate 70%) — roda em todo push e PR
- **E2E** (Playwright) — roda em PRs para `main`

Branch protection: PRs precisam de quality gate verde para mergeable.

---

## O que ainda não foi feito (TODO consciente)

- Cron de kill switch global (Vercel Cron ou GitHub Actions)
- Telas que o designer ainda não fez: definir senha pós-magic-link, recuperar senha, detalhe completo de peça com galeria
- Display real das fotos das peças no front (backend de signed URLs pronto, falta plugar nos cards)
- Upload de fotos no modal de cadastro (UI pronta, falta ligar no flow signed-URL → PUT → confirm)
- Cloudflare Turnstile no front (atualmente passa `'dev-bypass'`)
- Logo upload na página de configurações
- Integração com Sentry

---

## Licença

Privado. Todos os direitos reservados.

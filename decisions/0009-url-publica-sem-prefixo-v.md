# ADR 0009 — URL pública sem prefixo `/v`

> **Status:** Aceita (aprovada por Francisco em 02/05/2026)
> **Data:** 2026-05-02
> **Decisores:** Francisco (cliente/PO) + Claude
> **Substitui parcialmente:** [[../notes/proposta-tecnica-v1|Proposta v1]] usava `/v/[slug]`

## Contexto

A [[../notes/proposta-tecnica-v1|Proposta v1]] padronizou a vitrine pública em `/v/[slug]`, justificada por isolamento explícito vs. áreas protegidas (`/admin`, `/login`).

A [[../notes/2026-05-02-spec-produto-v2|Spec v2]] (§8.3, §15.3, §21.1) é taxativa em sentido contrário:

> ✅ correto: `vitrine.app/atelier-laila`
> ❌ incorreto: `vitrine.app/v/atelier-laila`

A URL é **parte da marca da loja**. `/atelier-laila` é elegante e digno de ser compartilhado em mídia social; `/v/atelier-laila` parece técnico, denuncia plataforma intermediária e quebra a sensação premium.

## Decisão

Vitrine pública passa a viver em `vitrine.app/[slug]` (sem prefixo `/v`).

A página de detalhe da peça, **se** existir como rota deep-link (caso o usuário cole o link direto fora da experiência drawer), vive em `vitrine.app/[slug]/peca/[id]`.

## Alternativas consideradas

- **Manter `/v/[slug]`** — Rejeitada. Spec v2 é explícita; a confusão com rotas internas é resolvível.
- **Subdomínio (`atelier-laila.vitrine.app`)** — Rejeitada para o MVP. Custo ops alto (wildcard SSL, DNS dinâmico, edge config), benefício marginal vs. path-based no curto prazo.
- **Path com 2 segmentos (`/loja/[slug]`)** — Rejeitada. Mesma crítica de "denuncia plataforma".

## Consequências

### ✅ Positivas

- URL alinhada à expectativa de produto (premium, sem ruído).
- Loja usa URL como link na bio do Instagram com mais confiança.
- Reduz uma camada cognitiva.

### ⚠️ Negativas / cuidados

- **Conflito potencial com rotas internas.** Slugs precisam ser validados contra uma allow/deny list. Já existe base em `_app/src/server/lojas/slug.ts` — basta estender com **todos** os top-level paths existentes:
  - `admin`, `super-admin`, `login`, `recuperar-senha`, `definir-senha`, `privacidade`, `termos`, `api`, `app`, `auth`, `static`, `_next`, `favicon.ico`, `robots.txt`, `sitemap.xml`, `images`, `assets`, `public`.
- **Resolução de rota custa mais.** Next.js precisa, para todo path raiz não-rotulado estaticamente, perguntar ao banco se o slug existe. Mitigação: cache em memória (LRU 5min) + 404 estável.
- **Migrar links já enviados** (se houver). Rota antiga `/v/[slug]` deve responder com **301 → /[slug]** por pelo menos 90 dias.

### 🔄 Migrações técnicas

1. **App Router**:
   - Remover `_app/src/app/(public)/v/[slug]/page.tsx`
   - Criar `_app/src/app/[slug]/page.tsx` (catch-all controlado pelo middleware)
   - Reescrever `middleware.ts` para distinguir slug de loja vs. rota reservada (consulta cache → banco).
2. **Função SECURITY DEFINER da vitrine pública**: nenhuma mudança (já recebe slug como parâmetro).
3. **UI super-admin**: trocar preview de criação de loja de `vitrine.app/v/{slug}` para `vitrine.app/{slug}`.
4. **WhatsApp helper** (`src/lib/whatsapp/link.ts`): se referencia URL da peça, atualizar.
5. **Redirect** `/v/[slug]/*` → `/[slug]/*` em `next.config.mjs` ou `middleware.ts`.

## Critério de aceite

- `vitrine.app/atelier-laila` carrega vitrine pública.
- `vitrine.app/v/atelier-laila` redireciona 301 para `vitrine.app/atelier-laila`.
- `vitrine.app/admin` continua chegando no painel (não tenta resolver `admin` como slug).
- Tentativa de criar loja com slug em conflito (`admin`, `login`, etc.) retorna erro de validação.

## Referências

- [[../notes/2026-05-02-spec-produto-v2|Spec v2 — §8.3, §15.3, §21.1]]
- [[../notes/proposta-tecnica-v1|Proposta v1 — §11]]
- `_app/src/server/lojas/slug.ts` — lista de slugs reservados (a estender)

---
**Tags:** #projeto/vitrine-virtual #adr #routing #produto

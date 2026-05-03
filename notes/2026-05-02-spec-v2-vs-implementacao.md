# Diff — Spec v2 vs implementação real

> **Data:** 2026-05-02
> **Insumos:** [[2026-05-02-spec-produto-v2|Spec v2]] · `_app/` real (lido em 02/05) · ADRs 0001–0008 · daily de 27/04 e 28/04
> **Objetivo:** mapear o que muda, o que permanece, o que vira tarefa nova / ADR nova / refactor.

## TL;DR

A spec v2 é uma evolução focada em **regras de produto e UX**. Stack permanece. Provider de IA **já existe** para Nano Banana (`google-ai.ts`) — só precisa promover a #1. Os outros impactos são de produto:

1. **Schema:** `pecas.tamanho text` → relação 1‑N `peca_tamanhos` ([[../decisions/0010-venda-por-tamanho|ADR 0010]])
2. **Schema:** `lojas` ganha `tagline`, `storefront_visible`, `fitting_room_background_*` ([[../decisions/0011-fundo-provador-configuravel|ADR 0011]])
3. **Routing:** rota pública passa de `/v/[slug]` para `/[slug]` ([[../decisions/0009-url-publica-sem-prefixo-v|ADR 0009]])
4. **Provador:** passa de **1 foto** (cliente final) para **2 fotos** (rosto + corpo) ([[../decisions/0012-cabine-duas-fotos|ADR 0012]])
5. **Provider IA:** Nano Banana (`google-ai.ts`) vira #1; FASHN/Replicate como fallback ([[../decisions/0013-provider-ia-nano-banana-prioridade|ADR 0013]])
6. **UX:** linguagem sem "IA" no front cliente, padronização rígida de imagens via Supabase Transforms, drawer de peça antes da cabine, dois modos de vitrine.
7. **Cadastro:** simplificar — confirmar zero resquício de cor/estado/descrição (já garantido por [[../decisions/0008-pecas-mvp-enxuto-sem-campos-extras|ADR 0008]]).

## Realidade do código (lido em 02/05)

| Item | Status atual no `_app/` |
|---|---|
| `src/lib/try-on/fashn.ts` | ✅ existe |
| `src/lib/try-on/google-ai.ts` (Nano Banana) | ✅ existe, usa native fetch (sem SDK) |
| `src/lib/try-on/openai.ts` | ✅ existe (arquivo) **mas não está plugado** no orchestrator |
| `src/lib/try-on/replicate.ts` | ✅ existe |
| `src/lib/try-on/orchestrator.ts` ordem atual | `FASHN → Google AI → Replicate` (pula provider sem key) |
| Variável `GOOGLE_AI_API_KEY` no `.env.example` | ✅ existe (linha 59) |
| `GOOGLE_AI_MODEL` default | `gemini-2.5-flash-image` (= Nano Banana) ✅ |
| Bucket `pecas-fotos` (privado) + `lojas-logos` (público) | ✅ |
| RLS em todas as tabelas | ✅ |
| 13 API routes | ✅ |
| Cota mensal + kill switch | ✅ |
| `pecas.tamanho` | text (1‑1) — **incompatível com spec v2** |
| Fundo configurável | ❌ não existe |
| Toggle `storefront_visible` | ❌ não existe |
| Tagline | ❌ não existe |
| Rota pública | `/v/[slug]` — **precisa migrar** |
| Drawer da peça | ❌ hoje abre `/v/[slug]/peca/[id]` como página |
| Vitrine modo foco | ❌ só grade |
| Filtro categoria | ❌ |
| Busca admin | ❌ ou parcial |
| Cabine 2 fotos | ❌ recebe 1 foto-pessoa hoje |
| `<VendidoModal>` | ❌ |
| Pipeline thumb | ❌ usa original ainda em alguns lugares |

## Tabela de impacto por área

| Área | Spec v2 | Estado | Impacto |
|---|---|---|---|
| Stack base | Não opina | Next.js 14 + Supabase + Vercel ([[../decisions/0001-stack-supabase-nextjs-vercel\|ADR 0001]]) | ✅ sem mudança |
| Multi-tenancy | Cada loja isolada | RLS ([[../decisions/0005-multi-tenancy-rls-postgres\|ADR 0005]]) | ✅ |
| Privacidade foto | Não persistir | Buffer-only ([[../decisions/0006-privacidade-foto-cliente-final\|ADR 0006]]) | ✅ vale para 2 fotos também |
| Anti-abuso | Cota + kill switch | 4 camadas ([[../decisions/0004-anti-abuso-quatro-camadas\|ADR 0004]]) | ✅ |
| Provider IA | (não opina, mas escolha do usuário em 02/05) | FASHN/Google/Replicate todos implementados | 🔄 promover Google a #1 ([[../decisions/0013-provider-ia-nano-banana-prioridade\|ADR 0013]]) |
| URL pública | `/{slug}` | `/v/[slug]` | 🔄 migrar + 301 ([[../decisions/0009-url-publica-sem-prefixo-v\|ADR 0009]]) |
| Tamanho da peça | 1‑N | text (1‑1) | 🔄 migration `peca_tamanhos` ([[../decisions/0010-venda-por-tamanho\|ADR 0010]]) |
| Fundo provador | branco/custom | inexistente | 🆕 colunas + bucket + UI ([[../decisions/0011-fundo-provador-configuravel\|ADR 0011]]) |
| `storefront_visible` | toggle | inexistente | 🆕 |
| Cadastro peça | nome/preço/tamanho(s)/categoria | parcial | 🔄 múltipla seleção + categoria + custom |
| Cor/estado/descrição | proibidos | excluídos por [[../decisions/0008-pecas-mvp-enxuto-sem-campos-extras\|ADR 0008]] | ✅ confirmar |
| Vitrine grade/foco | dois modos | só grade | 🆕 toggle + componente foco |
| Filtro categoria | sim | inexistente | 🆕 |
| Drawer peça | bottom sheet | página separada | 🔄 trocar para drawer + manter rota deep-link |
| Não-ecommerce | sem reviews/descrição | OK no schema | ✅ confirmar UI |
| Padronização imagens | uniforme | placeholder atual mistura | 🔄 Supabase Transforms + helper |
| Linguagem "sem IA" | front cliente sem "IA" | strings com "IA" em vários lugares | 🔄 audit |
| WhatsApp na tela final | discreto | prominente | 🔄 reduzir peso |
| Config tela única | uma tela só | já é uma tela | ✅ + adicionar campos |
| Slug oculto p/ lojista | sim | precisa audit | 🔍 |
| Modal vendido por tamanho | sim | inexistente | 🆕 |
| Loading sem porcentagem | sim | spinner padrão | 🔄 |

Legenda: ✅ sem mudança · 🔄 refactor · 🆕 novo · 🔍 audit

## ADRs novos (0009-0013, todos Aceita em 02/05)

1. ✅ [[../decisions/0009-url-publica-sem-prefixo-v|0009]] — URL pública sem `/v`
2. ✅ [[../decisions/0010-venda-por-tamanho|0010]] — Venda por tamanho (`peca_tamanhos`)
3. ✅ [[../decisions/0011-fundo-provador-configuravel|0011]] — Fundo configurável do provador
4. ✅ [[../decisions/0012-cabine-duas-fotos|0012]] — Cabine de duas fotos (rosto + corpo)
5. ✅ [[../decisions/0013-provider-ia-nano-banana-prioridade|0013]] — Nano Banana (`google-ai.ts`) como prioridade #1

## Schema diff (lojas)

```sql
-- adicionar
ALTER TABLE lojas ADD COLUMN tagline text;
ALTER TABLE lojas ADD COLUMN storefront_visible boolean NOT NULL DEFAULT true;
ALTER TABLE lojas ADD COLUMN fitting_room_background_type text NOT NULL DEFAULT 'white'
  CHECK (fitting_room_background_type IN ('white','custom'));
ALTER TABLE lojas ADD COLUMN fitting_room_background_url text;

-- constraint coerência
ALTER TABLE lojas ADD CONSTRAINT bg_url_required_when_custom
  CHECK (fitting_room_background_type = 'white'
         OR fitting_room_background_url IS NOT NULL);
```

## Schema diff (peca_tamanhos + categorias)

```sql
CREATE TABLE peca_tamanhos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  peca_id     uuid NOT NULL REFERENCES pecas(id) ON DELETE CASCADE,
  tamanho     text NOT NULL,
  status      text NOT NULL DEFAULT 'disponivel'
              CHECK (status IN ('disponivel','vendida')),
  vendido_em  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(peca_id, tamanho)
);

-- backfill
INSERT INTO peca_tamanhos (peca_id, tamanho, status)
SELECT id, tamanho, status FROM pecas WHERE tamanho IS NOT NULL AND tamanho <> '';

-- forward only
ALTER TABLE pecas DROP COLUMN tamanho;

-- categorias padrão (lista global gerenciada pelo super-admin)
CREATE TABLE categorias_padrao (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome  text NOT NULL UNIQUE,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true
);

INSERT INTO categorias_padrao (nome, ordem) VALUES
  ('Vestidos', 10), ('Saias', 20), ('Blusas', 30), ('Camisas', 40),
  ('Calças', 50), ('Shorts', 60), ('Macacões', 70), ('Conjuntos', 80),
  ('Casacos', 90), ('Acessórios', 100);

ALTER TABLE pecas ADD COLUMN categoria_id uuid REFERENCES categorias_padrao(id);
```

(Trigger para sincronizar `pecas.status` com agregado de `peca_tamanhos` em [[../decisions/0010-venda-por-tamanho|ADR 0010]].)

## Routing diff

| Antes | Depois | Notas |
|---|---|---|
| `/v/[slug]` | `/[slug]` | proteger via slug-reserved list — já existe parcialmente em `_app/src/server/lojas/slug.ts` |
| `/v/[slug]/peca/[id]` | `/[slug]/peca/[id]` (deep-link fallback) | drawer é o caminho normal; rota fica para colado externo |
| Redirect 301 | `/v/*` → `/*` por 90 dias |  |

## Provider IA — diff de prioridade

```diff
// _app/src/lib/try-on/orchestrator.ts (atual)
- if (isFeatureConfigured('try_on_fashn'))    providers.push(fashnProvider)
- if (isFeatureConfigured('try_on_google'))   providers.push(googleAiProvider)
- if (isFeatureConfigured('try_on_replicate')) providers.push(replicateProvider)

// depois ([[../decisions/0013-provider-ia-nano-banana-prioridade|ADR 0013]])
+ if (isFeatureConfigured('try_on_google'))   providers.push(googleAiProvider)   // #1
+ if (isFeatureConfigured('try_on_fashn'))    providers.push(fashnProvider)      // fallback
+ if (isFeatureConfigured('try_on_replicate')) providers.push(replicateProvider) // último
```

E atualizar comentário/log do `.env.example`: "Ordem: Nano Banana → FASHN → Replicate".

## Linguagem do produto — strings que precisam mudar

Audit grep alvo: ocorrências de **"IA"** ou **"AI"** em:
- `_app/src/app/(public)/**/*.tsx`
- `_app/src/components/public/**/*.tsx`
- `_app/src/components/cabine/**/*.tsx` (se existir)

Ver [[spec/13-linguagem-sem-ia|spec 13]] para tabela de substituição.

## Riscos novos introduzidos pela v2

| # | Risco | Mitigação | Status |
|---|---|---|---|
| R1 | Migrar `tamanho text` → `peca_tamanhos` | Migration backfill + forward only | aceito ([[../decisions/0010-venda-por-tamanho\|ADR 0010]]) |
| R2 | `/v/[slug]` → `/[slug]` quebra links | 301 por 90 dias | aceito ([[../decisions/0009-url-publica-sem-prefixo-v\|ADR 0009]]) |
| R3 | ~~Provider 2 fotos?~~ | Nano Banana aceita multi-imagem nativamente. `google-ai.ts` precisa ser estendido para receber 2 fotos pessoa + peça (+ fundo) | testar no spike ([[../decisions/0012-cabine-duas-fotos\|ADR 0012]]) |
| R4 | Slug colide com rota interna | Lista de reservados — só estender | aceito |
| R5 | Pipeline thumb | Supabase Storage Transforms on-the-fly | confirmado ([[spec/12-padronizacao-imagens]]) |
| R6 | Política Google: free tier usa pra treinar | Cliente confirmou **paid tier ativo** — OK ([[../decisions/0006-privacidade-foto-cliente-final\|ADR 0006]] mantém) | resolvido |
| R7 | Quality Nano Banana vs FASHN especializado | FASHN como fallback se key configurada — comparação A/B viável | mitigado pela ordem ([[../decisions/0013-provider-ia-nano-banana-prioridade\|ADR 0013]]) |

## Próximos passos imediatos

- [x] Cliente aprovou ADRs 0009–0013 (02/05)
- [x] Cliente confirmou Google AI Studio paid tier (compatível com ADR 0006)
- [x] Pipeline imagem definido (Supabase Transforms)
- [x] Categoria definida (lista padrão global)
- [ ] Cliente colar `GOOGLE_AI_API_KEY` em `_app/.env.local`
- [ ] Spike Nano Banana com 2 fotos pessoa + peça (+ fundo) — confirmar quality e latência
- [ ] Refactor orchestrator (Google a #1)
- [ ] Migrations P0 (peca_tamanhos, categorias_padrao, lojas extras)
- [ ] Routing migration `/v` → `/`
- [ ] Refactor cabine para 2 fotos
- [ ] UI cadastro com tamanhos múltiplos + categoria
- [ ] `<VendidoModal>` + server action
- [ ] Audit linguagem "IA" no front cliente

---
**Tags:** #projeto/vitrine-virtual #diff #refactor #2026-05-02

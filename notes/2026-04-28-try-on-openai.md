# Try-on com OpenAI — implementação

> Sessão de 28/04/2026.

## Contexto

Cliente pediu pra fazer o provador virtual funcionar usando OpenAI. Outro dev mexeu no código durante minha ausência e deixou sinais de OpenAI nos system-reminders do vault local (`types.ts` com `'openai'`, `orchestrator.ts` importando `./openai`), mas nenhum desses commits chegou ao GitHub.

## Estado real do `main` no GitHub (ao iniciar)

- ✅ `fashn.ts`, `google-ai.ts`, `replicate.ts`
- ❌ `openai.ts` **não existe**
- `types.ts.TryOnProvider['name']` = `'fashn' | 'replicate' | 'google'`
- `env.ts.isFeatureConfigured` aceita só `try_on_fashn | try_on_replicate | try_on_google`
- `orchestrator.ts` chama 3 providers (fashn, google-ai, replicate)
- Enum `try_on_provider` no banco tem `'fashn' | 'replicate' | 'google'`

## O que vou fazer (branch `feat/try-on-openai`)

1. **Migration no Supabase**: adicionar valor `'openai'` ao enum `try_on_provider` (ALTER TYPE ... ADD VALUE)
2. **`_app/src/lib/env.ts`**:
   - Schema: `OPENAI_API_KEY` (opcional), `OPENAI_IMAGE_MODEL` (default `gpt-image-1`)
   - `isFeatureConfigured('try_on_openai')`
3. **`_app/src/lib/try-on/types.ts`**: incluir `'openai'` no union de provider names
4. **`_app/src/lib/try-on/openai.ts`** (novo): provider que chama `images/edits` da OpenAI com 2 imagens (cliente + peça) e prompt direcionado para fashion try-on
5. **`_app/src/lib/try-on/orchestrator.ts`**:
   - Incluir `openAiProvider` na lista
   - **OpenAI vira prioridade 1** (cliente pediu)
   - Pular providers sem key configurada (já documentado nos system-reminders)
6. **`_app/src/types/database.ts`**: adicionar `'openai'` no enum
7. **`.env.example`**: documentar `OPENAI_API_KEY` na seção de provador IA
8. **Testes**: ajustar `orchestrator.test.ts` se houver hardcode da lista

## API da OpenAI usada

- Endpoint: `POST https://api.openai.com/v1/images/edits`
- Modelo: `gpt-image-1` (suporta multi-image via `image[]`)
- Multipart body:
  - `image[]` — foto do cliente (file)
  - `image[]` — foto da peça (file)
  - `model` — `gpt-image-1`
  - `prompt` — instruções de virtual try-on
  - `n` — 1
  - `size` — `1024x1024` ou `auto`
- Resposta: `{ data: [{ b64_json: '...' }] }`
- Custo: ~US$ 0,04 (high quality) ou ~US$ 0,011 (medium)

## Privacidade (ADR 0006)

- Foto do cliente final em **memória só durante request** ✅
- Header `X-No-Retention` não existe na OpenAI, mas a doc diz que conteúdo de Images Edit **não é usado para treinar** modelos
- Resultado salvo em buffer base64 → upload pra Supabase Storage com TTL curto OU devolve data URL direto

## Decisão: como expor o resultado

Opção A: data URL inline na resposta (sem persistência) — mais simples, sem TTL
Opção B: subir pro Supabase Storage com signed URL de 24h — alinhado com FASHN/Google
Opção C: blob URL temporário em memória do server

Vou usar **Opção B** (mesma estratégia do google-ai.ts já feito pelo outro dev) para consistência.

---
**Tags:** #projeto/vitrine-virtual #try-on #openai #2026-04-28

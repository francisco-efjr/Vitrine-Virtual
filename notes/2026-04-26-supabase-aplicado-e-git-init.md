# Supabase aplicado + repositório inicializado

> Sessão de 26/04/2026, depois do daily.

## O que aconteceu

Cliente conectou o projeto Supabase e me autorizou a:
- Aplicar migrations no banco real
- Inicializar git e commitar
- Subir no GitHub
- Escrever instruções de "como rodar localmente"

Telas e domínio ficam para depois. Vamos rodar local por enquanto.

## Projeto Supabase

| | |
|---|---|
| Project ID | `tfylrbxajzmhsdnynpbx` |
| Region | us-east-1 |
| URL | https://tfylrbxajzmhsdnynpbx.supabase.co |
| Postgres | 17 (release: ga) |
| Status | ACTIVE_HEALTHY |

**Anon key (legacy, JWT):** salva no `.env.local` do cliente.
**Publishable key (recomendada):** `sb_publishable_RMFXZUYN78etrs7XV8nbjg_Vqw0ipgy` — pode ser trocada futuramente sem invalidar a anon legacy.

## Migrations aplicadas (5)

1. `schema_inicial` — 6 tabelas (profiles, lojas, pecas, pecas_fotos, try_on_uses, system_settings) + 3 enums + triggers
2. `rls_policies` — RLS habilitada em todas, helpers `is_super_admin()` e `current_user_loja_id()`
3. `vitrine_publica_functions` — 4 funções `SECURITY DEFINER` para anon (vitrine pública)
4. `storage_buckets_e_policies` — buckets `pecas-fotos` (privado) + `lojas-logos` (público)
5. `otimizar_rls_e_indices` — refatoração das policies para `(select auth.uid())`, unificação owner+super_admin numa única policy por ação, índices nas FKs

### Advisor status final

- **Security:** 0 lints — banco totalmente saudável
- **Performance:** 10 INFO de "unused_index" — esperado, banco vazio. Conforme dados começarem a fluir, índices serão usados.

## Decisões/correções tomadas durante a aplicação

- Removido índice `try_on_uses_loja_month_idx` que usava `date_trunc('month', created_at)` (não é IMMUTABLE). O índice `(loja_id, created_at desc)` cobre buscas por mês via range scan.
- `touch_updated_at` ganhou `set search_path = public` (advisor `function_search_path_mutable`).
- Bucket `lojas-logos`: removida policy de SELECT broad — buckets públicos servem objetos via URL direta sem precisar disso. Evita listing não intencional.
- Policies RLS unificadas: em vez de duas policies por ação (`pecas_owner_*` + `pecas_super_admin_all`), uma única policy com `OR`. Menos avaliações por query.
- `auth.uid()` → `(select auth.uid())` em todas as policies. Evita re-avaliação por row (~10x mais rápido em queries grandes).

## Tipos TS

`src/types/database.ts` agora é gerado automaticamente do schema (substitui a versão escrita à mão). Regenerar com `pnpm supabase:types` após qualquer migration.

## Git

- Repo iniciado em `/tmp/vitrine-virtual` (sandbox) porque o vault tem restrições NTFS pra criar `.git/config.lock`.
- 1º commit estruturado: **a4fb102**
- 107 arquivos, 7.254 linhas inseridas

### Entregáveis em `outputs/`

- `vitrine-virtual.bundle` (94 KB) — formato git oficial, importável com `git clone vitrine-virtual.bundle vitrine-virtual`
- `vitrine-virtual.tar.gz` (66 KB) — projeto sem `.git`, descompacta direto

## Pendências do cliente

- [ ] Criar repositório no GitHub e adicionar como remote
- [ ] Mover pasta para fora do vault Obsidian (recomendado)
- [ ] Criar primeiro super-admin no Supabase Auth + atualizar `profiles.role`
- [ ] Preencher `.env.local` com keys do Supabase
- [ ] (depois) criar conta FASHN.ai, Replicate, Upstash, Cloudflare Turnstile
- [ ] (depois) criar repo na Vercel para deploy

---
**Tags:** #projeto/vitrine-virtual #2026-04-26 #supabase #git

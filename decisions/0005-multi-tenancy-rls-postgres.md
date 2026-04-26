# ADR 0005 — Multi-tenancy via Row Level Security do PostgreSQL

> **Status:** Aceita
> **Data:** 2026-04-25
> **Decisores:** Francisco (cliente/PO) + Claude

## Contexto

O Vitrine Virtual precisa hospedar **múltiplas lojas no mesmo sistema**, com isolamento absoluto: uma loja **nunca** pode ler, alterar ou deletar dados de outra. Esse é um requisito **crítico** do brief — vazamento entre lojas é o pior bug imaginável para o produto.

Requisitos do brief:
- Cada loja tem dados, peças, fotos, configurações e links próprios.
- Painel admin só vê dados da loja logada.
- Vitrine pública só expõe dados da loja correspondente ao slug.
- Onboarding manual ([[0003-onboarding-manual-super-admin]]) gera contas isoladas.

Restrições técnicas:
- Stack escolhida: PostgreSQL via Supabase ([[0001-stack-supabase-nextjs-vercel]]).
- Free tier do Supabase = 1 banco compartilhado, sem schemas isolados.

## Decisão

Usar **Row Level Security (RLS) do PostgreSQL** em **todas** as tabelas com `loja_id`. Cada policy filtra por `auth.uid()` cruzado com `lojas.owner_user_id`. Vitrine pública usa **funções `SECURITY DEFINER`** que filtram por slug, sem expor as tabelas diretamente para o role `anon`.

## Alternativas consideradas

- **Opção A — Banco por tenant (database-per-tenant):** Isolamento físico máximo. **Rejeitada** porque o free tier do Supabase tem 1 banco e o custo de N bancos é proibitivo no MVP. Além disso, complica migrações (precisa rodar em N bancos).

- **Opção B — Schema por tenant (schema-per-tenant):** Cada loja tem seu schema dentro do mesmo banco. **Rejeitada** porque o Supabase Auth/PostgREST não suporta bem schemas dinâmicos e migrações ficam complexas.

- **Opção C — Filtragem na aplicação (sem RLS):** Confiar 100% no código da API para filtrar por `loja_id`. **Rejeitada** porque é frágil — um único endpoint que esquece o filtro vaza dados entre lojas. Sem defesa em profundidade.

- **Opção D (escolhida) — Tenant column + RLS:** Coluna `loja_id` em todas as tabelas tenant-aware + policies de RLS que filtram automaticamente. Defesa em profundidade: mesmo que a aplicação tenha bug, o banco recusa retornar dados de outra loja.

## Consequências

- ✅ **Positivas:**
  - **Defesa em profundidade real:** mesmo um endpoint mal escrito não vaza dados.
  - Migrações simples (uma migration roda no banco único).
  - Vitrine pública pode usar `anon` role com RLS — sem precisar de service role no front.
  - Compatível com o cliente JS do Supabase no browser (RLS automática via JWT).
  - Permite o painel super-admin ([[0003-onboarding-manual-super-admin]]) usar a mesma estrutura, com policy especial para role `super_admin`.

- ⚠️ **Negativas / trade-offs:**
  - Policies precisam ser **escritas e testadas individualmente** para cada tabela. Esquecer uma = bug.
  - Performance: RLS adiciona overhead em queries grandes. Mitigação: índices em `loja_id` em todas as tabelas tenant-aware.
  - Debugging mais difícil — uma query que retorna 0 linhas pode ser RLS bloqueando, não filtro errado.
  - Operações administrativas precisam usar o `service_role` (que ignora RLS) — esse role **nunca** pode chegar ao browser.

- 🔄 **Reversibilidade:** Média. Migrar para banco-por-tenant depois é trabalhoso (export/import por loja). Trocar o filtro de RLS por filtro na aplicação é trivial mas perigoso (perde defesa em profundidade).

## Estrutura das policies (esboço)

```sql
-- Habilitar RLS
alter table pecas enable row level security;

-- Lojistas leem só suas peças
create policy "lojistas_select_own_pecas" on pecas
for select using (
  loja_id in (select id from lojas where owner_user_id = auth.uid())
);

-- Lojistas escrevem só nas suas peças
create policy "lojistas_modify_own_pecas" on pecas
for all using (
  loja_id in (select id from lojas where owner_user_id = auth.uid())
)
with check (
  loja_id in (select id from lojas where owner_user_id = auth.uid())
);

-- Super-admin vê tudo (role na tabela profiles)
create policy "super_admin_select_all_pecas" on pecas
for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'super_admin')
);

-- Vitrine pública: função SECURITY DEFINER, NÃO expõe a tabela direto
create or replace function public.get_pecas_publicas(p_slug text)
returns table (id uuid, nome text, foto_url text, preco_publico int, tamanho text)
language sql security definer set search_path = public as $$
  select p.id, p.nome, f.storage_path, 
    case when l.exibir_preco_publico then p.preco_centavos else null end,
    p.tamanho
  from lojas l
  join pecas p on p.loja_id = l.id
  left join pecas_fotos f on f.id = p.foto_principal_id
  where l.slug = p_slug and p.status = 'disponivel'
  order by p.created_at desc
$$;
```

## Testes obrigatórios (a rodar na CI)

- Loja A não consegue `SELECT` peças da loja B (mesmo com endpoint mal escrito).
- Loja A não consegue `INSERT` peça com `loja_id` da loja B.
- Loja A não consegue `UPDATE/DELETE` peça da loja B.
- Cliente anônimo (vitrine pública) não consegue ler dados administrativos.
- Cliente anônimo só vê peças `disponivel` via `get_pecas_publicas`.
- Super-admin vê todas as lojas.

Esses testes vivem em `tests/integration/rls.test.ts` e são parte do quality gate.

## Referências

- [[../README|README do projeto]]
- [[0001-stack-supabase-nextjs-vercel|ADR 0001 — Stack base]]
- [[0003-onboarding-manual-super-admin|ADR 0003 — Onboarding]]
- [[../notes/proposta-tecnica-v1|Proposta Técnica v1 — seções 5 e 6]]
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- PostgreSQL RLS: https://www.postgresql.org/docs/current/ddl-rowsecurity.html

---
**Tags:** #adr #projeto/vitrine-virtual #seguranca #multi-tenancy #postgres

-- =============================================================================
-- 20260529000019_pagination.sql
--
-- Paginação na vitrine pública. O RPC `get_pecas_publicas` recebe dois
-- params opcionais (`p_limit`, `p_offset`); quando ausentes, mantém o
-- comportamento histórico (até 100 peças — limite defensivo).
--
-- Estratégia:
--   - Cliente SSR pede primeira página (24 peças)
--   - Cliente front pede `/api/v/{slug}/pecas?offset=24` quando o usuário
--     clica "Carregar mais"
--   - Cursor por offset (não por created_at) porque a ordenação já é
--     determinística por created_at desc — colisões nem aparecem com
--     `id` como tie-breaker secundário.
--
-- Não-breaking: callers existentes continuam funcionando — os defaults
-- (limit 100, offset 0) preservam o comportamento.
-- =============================================================================

drop function if exists public.get_pecas_publicas(text);
drop function if exists public.get_pecas_publicas(text, int, int);

create function public.get_pecas_publicas(
  p_slug   text,
  p_limit  int default 100,
  p_offset int default 0
)
returns table (
  peca_id             uuid,
  nome                text,
  tamanho             text,
  preco_centavos      int,            -- null se exibir_preco_publico = false
  foto_principal_path text,
  fotos_count         int,
  created_at          timestamptz,
  total_count         bigint          -- total de peças disponíveis (pra UI saber se tem próxima)
)
language sql stable security definer set search_path = public
as $$
  with loja as (
    select id, exibir_preco_publico
    from public.lojas
    where slug = p_slug and ativa = true
    limit 1
  ),
  total as (
    select count(*)::bigint as n
    from public.pecas p
    join loja l on l.id = p.loja_id
    where p.status = 'disponivel'
  )
  select
    p.id,
    p.nome,
    p.tamanho,
    case when (select exibir_preco_publico from loja) then p.preco_centavos else null end,
    fp.storage_path,
    (select count(*)::int from public.pecas_fotos where peca_id = p.id),
    p.created_at,
    (select n from total)
  from public.pecas p
  join loja l on l.id = p.loja_id
  left join public.pecas_fotos fp on fp.id = p.foto_principal_id
  where p.status = 'disponivel'
  order by p.created_at desc, p.id desc
  limit greatest(coalesce(p_limit, 100), 0)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

revoke all on function public.get_pecas_publicas(text, int, int) from public;
grant execute on function public.get_pecas_publicas(text, int, int) to anon, authenticated;

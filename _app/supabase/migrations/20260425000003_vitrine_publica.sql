-- =============================================================================
-- Vitrine Virtual — funções SECURITY DEFINER para a vitrine pública (anon)
-- ADR 0005: vitrine pública não acessa tabelas direto, vai via funções controladas.
-- =============================================================================

-- Retorna dados públicos de uma loja por slug.
-- - Só retorna lojas ativas.
-- - Preço só é incluído se exibir_preco_publico = true.
create or replace function public.get_vitrine_publica(p_slug text)
returns table (
  loja_id              uuid,
  nome                 text,
  slug                 text,
  logo_storage_path    text,
  instagram            text,
  tiktok               text,
  whatsapp_e164        text,
  exibir_preco_publico boolean
)
language sql stable security definer set search_path = public
as $$
  select id, nome, slug, logo_storage_path, instagram, tiktok, whatsapp_e164, exibir_preco_publico
  from public.lojas
  where slug = p_slug and ativa = true
  limit 1
$$;

revoke all on function public.get_vitrine_publica(text) from public;
grant execute on function public.get_vitrine_publica(text) to anon, authenticated;

-- Retorna peças disponíveis de uma loja, com a foto principal e preço condicional.
create or replace function public.get_pecas_publicas(p_slug text)
returns table (
  peca_id            uuid,
  nome               text,
  tamanho            text,
  preco_centavos     int,            -- null se exibir_preco_publico = false
  foto_principal_path text,
  fotos_count        int,
  created_at         timestamptz
)
language sql stable security definer set search_path = public
as $$
  with loja as (
    select id, exibir_preco_publico
    from public.lojas
    where slug = p_slug and ativa = true
    limit 1
  )
  select
    p.id,
    p.nome,
    p.tamanho,
    case when (select exibir_preco_publico from loja) then p.preco_centavos else null end,
    fp.storage_path,
    (select count(*)::int from public.pecas_fotos where peca_id = p.id),
    p.created_at
  from public.pecas p
  join loja l on l.id = p.loja_id
  left join public.pecas_fotos fp on fp.id = p.foto_principal_id
  where p.status = 'disponivel'
  order by p.created_at desc
$$;

revoke all on function public.get_pecas_publicas(text) from public;
grant execute on function public.get_pecas_publicas(text) to anon, authenticated;

-- Retorna uma peça pública específica (link compartilhável /v/[slug]/peca/[id]).
create or replace function public.get_peca_publica(p_slug text, p_peca_id uuid)
returns table (
  peca_id            uuid,
  nome               text,
  tamanho            text,
  preco_centavos     int,
  fotos              jsonb       -- array de { id, storage_path, ordem }
)
language sql stable security definer set search_path = public
as $$
  with loja as (
    select id, exibir_preco_publico
    from public.lojas
    where slug = p_slug and ativa = true
    limit 1
  )
  select
    p.id,
    p.nome,
    p.tamanho,
    case when (select exibir_preco_publico from loja) then p.preco_centavos else null end,
    coalesce(
      (select jsonb_agg(jsonb_build_object('id', f.id, 'storage_path', f.storage_path, 'ordem', f.ordem)
                        order by f.ordem asc)
       from public.pecas_fotos f where f.peca_id = p.id),
      '[]'::jsonb
    )
  from public.pecas p
  join loja l on l.id = p.loja_id
  where p.id = p_peca_id and p.status = 'disponivel'
$$;

revoke all on function public.get_peca_publica(text, uuid) from public;
grant execute on function public.get_peca_publica(text, uuid) to anon, authenticated;

-- Conta uso do try-on no mês corrente para uma loja (usado para checar cota).
create or replace function public.try_on_uso_mes_atual(p_loja_id uuid)
returns int
language sql stable security definer set search_path = public
as $$
  select count(*)::int
  from public.try_on_uses
  where loja_id = p_loja_id
    and success = true
    and date_trunc('month', created_at) = date_trunc('month', now())
$$;

grant execute on function public.try_on_uso_mes_atual(uuid) to authenticated, service_role;

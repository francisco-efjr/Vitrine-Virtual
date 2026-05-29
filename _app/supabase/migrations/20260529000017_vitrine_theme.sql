-- =============================================================================
-- 20260529000017_vitrine_theme.sql
--
-- Tema visual da vitrine pública. Cada loja pode receber um tema dedicado
-- (ex: "CasaGabyHarb" — identidade verde-musgo/dourado feita sob medida pra
-- @casagabyharb). Lojas sem tema usam "default" (look padrão do produto).
--
-- A escolha do tema é feita pelo super-admin pelo painel /admin/super.
-- =============================================================================

alter table public.lojas
  add column if not exists vitrine_theme text not null default 'default'
    check (vitrine_theme in ('default', 'CasaGabyHarb'));

comment on column public.lojas.vitrine_theme is
  'Tema visual aplicado em /v/{slug}. "default" = look padrão da Vitrine Virtual; '
  '"CasaGabyHarb" = identidade dedicada da Casa Gaby Harb (verde-musgo + dourado).';

-- A vitrine pública precisa expor o tema escolhido pro Next renderizar o
-- layout correto a partir do slug. Mantém a assinatura existente + 1 coluna.
drop function if exists public.get_vitrine_publica(text);

create function public.get_vitrine_publica(p_slug text)
returns table (
  loja_id              uuid,
  nome                 text,
  slug                 text,
  logo_storage_path    text,
  instagram            text,
  tiktok               text,
  whatsapp_e164        text,
  exibir_preco_publico boolean,
  tagline              text,
  vitrine_theme        text
)
language sql stable security definer set search_path = public
as $$
  select
    l.id,
    l.nome,
    l.slug,
    l.logo_storage_path,
    l.instagram,
    l.tiktok,
    l.whatsapp_e164,
    l.exibir_preco_publico,
    l.tagline,
    l.vitrine_theme
  from public.lojas l
  where l.slug = p_slug
    and l.ativa = true
    and l.vitrine_publica_visivel = true
  limit 1
$$;

revoke all on function public.get_vitrine_publica(text) from public;
grant execute on function public.get_vitrine_publica(text) to anon, authenticated;

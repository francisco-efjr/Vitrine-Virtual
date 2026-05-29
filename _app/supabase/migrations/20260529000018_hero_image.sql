-- =============================================================================
-- 20260529000018_hero_image.sql
--
-- Adiciona o campo `hero_image_storage_path` na tabela `lojas`. É a foto
-- editorial fixa que aparece no arch-frame do hero do tema CGH (e em
-- futuros temas que quiserem honrar essa configuração). Quando NULL, a
-- vitrine cai no fallback de usar a foto da primeira peça da curadoria.
--
-- A foto é gravada no mesmo bucket `lojas-logos` que já hospeda logo e
-- fundo da Cabine — mesmas policies, mesma estratégia de path
-- determinístico `{loja_id}/hero_image-{uuid}.{ext}`.
-- =============================================================================

alter table public.lojas
  add column if not exists hero_image_storage_path text;

comment on column public.lojas.hero_image_storage_path is
  'Caminho no bucket lojas-logos da foto editorial que aparece no hero da '
  'vitrine pública (tema CGH usa, outros temas podem ignorar). NULL = fallback '
  'pra foto da primeira peça da curadoria.';

-- A vitrine pública precisa expor o caminho pra Server Component construir
-- a URL pública. Mantém a assinatura existente + 1 coluna.
drop function if exists public.get_vitrine_publica(text);

create function public.get_vitrine_publica(p_slug text)
returns table (
  loja_id                 uuid,
  nome                    text,
  slug                    text,
  logo_storage_path       text,
  instagram               text,
  tiktok                  text,
  whatsapp_e164           text,
  exibir_preco_publico    boolean,
  tagline                 text,
  vitrine_theme           text,
  hero_image_storage_path text
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
    l.vitrine_theme,
    l.hero_image_storage_path
  from public.lojas l
  where l.slug = p_slug
    and l.ativa = true
    and l.vitrine_publica_visivel = true
  limit 1
$$;

revoke all on function public.get_vitrine_publica(text) from public;
grant execute on function public.get_vitrine_publica(text) to anon, authenticated;

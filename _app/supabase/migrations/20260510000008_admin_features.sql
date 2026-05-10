-- =============================================================================
-- 20260510000008_admin_features.sql
--
-- Adiciona os campos do design entregue (Vitrine Virtual.html) que ainda não
-- existiam no schema:
--   • lojas.tagline                    — frase curta exibida na vitrine pública
--   • lojas.vitrine_publica_visivel    — kill switch da vitrine pelo lojista
--   • lojas.provador_fundo_tipo        — 'branco' (default) ou 'personalizado'
--   • lojas.provador_fundo_storage_path — caminho da imagem de fundo no bucket
--                                         lojas-logos (re-aproveita o público)
--   • pecas.categoria_id               — id da categoria (livre ou pré-definida)
--
-- Tudo com defaults seguros e NULL onde aplicável → migração não-breaking.
-- =============================================================================

alter table public.lojas
  add column if not exists tagline text
    check (tagline is null or length(tagline) <= 140),
  add column if not exists vitrine_publica_visivel boolean not null default true,
  add column if not exists provador_fundo_tipo text not null default 'branco'
    check (provador_fundo_tipo in ('branco', 'personalizado')),
  add column if not exists provador_fundo_storage_path text;

comment on column public.lojas.tagline is
  'Frase curta exibida no header da vitrine pública (até 140 chars).';
comment on column public.lojas.vitrine_publica_visivel is
  'Quando false, /v/{slug} responde 404 mesmo com peças cadastradas.';
comment on column public.lojas.provador_fundo_tipo is
  'Cabine: usa fundo branco padrão ou imagem personalizada da loja.';
comment on column public.lojas.provador_fundo_storage_path is
  'Quando provador_fundo_tipo=personalizado, caminho no bucket lojas-logos.';

alter table public.pecas
  add column if not exists categoria_id text
    check (categoria_id is null or length(categoria_id) between 1 and 60);

comment on column public.pecas.categoria_id is
  'Categoria da peça. Pode ser um id pré-definido (blusas, calcas, ...) ou um id customizado gerado a partir do nome digitado pela lojista.';

create index if not exists pecas_categoria_idx on public.pecas (categoria_id);

-- -----------------------------------------------------------------------------
-- Vitrine pública: respeita vitrine_publica_visivel
-- -----------------------------------------------------------------------------
-- Drop antes do CREATE para mudar a assinatura sem quebrar o GRANT antigo.
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
  tagline              text
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
    l.tagline
  from public.lojas l
  where l.slug = p_slug
    and l.ativa = true
    and l.vitrine_publica_visivel = true
  limit 1
$$;

revoke all on function public.get_vitrine_publica(text) from public;
grant execute on function public.get_vitrine_publica(text) to anon, authenticated;

-- get_pecas_publicas continua existente — a JOIN nele falha de forma natural
-- quando get_vitrine_publica volta vazio (página chama notFound() antes).

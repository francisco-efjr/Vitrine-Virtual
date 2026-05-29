-- Add 'tier_s_vertex' to the allowed values of try_on_generations.tier_chosen
-- and tier_effective (research §4.3 P2.14 — Vertex AI VTO para calçados).
--
-- Não-breaking: adiciona valor permitido sem remover os existentes.
-- Não altera RLS, não toca dados existentes.

alter table public.try_on_generations
  drop constraint if exists try_on_generations_tier_chosen_check;

alter table public.try_on_generations
  add constraint try_on_generations_tier_chosen_check
  check (
    tier_chosen is null
    or tier_chosen in ('tier_a_premium', 'tier_b_economy', 'tier_c_gemini', 'tier_s_vertex')
  );

alter table public.try_on_generations
  drop constraint if exists try_on_generations_tier_effective_check;

alter table public.try_on_generations
  add constraint try_on_generations_tier_effective_check
  check (
    tier_effective is null
    or tier_effective in ('tier_a_premium', 'tier_b_economy', 'tier_c_gemini', 'tier_s_vertex')
  );

comment on column public.try_on_generations.tier_chosen is
  'Tier ideal escolhido pelo router (chooseTier). Pode diferir do tier_effective quando Tier A/B/S estão desabilitados.';

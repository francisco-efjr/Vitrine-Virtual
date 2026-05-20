-- =============================================================================
-- 20260520000012_try_on_quality_gate_and_tier.sql
--
-- Habilita o "Try-On Tiered Architecture" + Quality Gate (research §4, §5, §9):
--
--   1. try_on_generations.gate_verdict       — 'proceed' | 'proceed_with_warning' | 'reject'
--   2. try_on_generations.gate_reason        — chave RejectionReason (texto livre constrained)
--   3. try_on_generations.gate_signals       — JSONB com signals brutos (analytics, tuning)
--   4. try_on_generations.feedback_reason    — uma das 6 chaves FeedbackReason (§9.2)
--   5. try_on_generations.tier_chosen        — tier ideal segundo o router
--   6. try_on_generations.tier_effective     — tier que efetivamente rodou
--
-- Todas opcionais (NULL) → migração não-breaking. Não altera RLS.
-- =============================================================================

alter table public.try_on_generations
  add column if not exists gate_verdict text
    check (gate_verdict is null or gate_verdict in ('proceed', 'proceed_with_warning', 'reject'));

alter table public.try_on_generations
  add column if not exists gate_reason text
    check (
      gate_reason is null
      or gate_reason in (
        'no_person',
        'multiple_people',
        'too_blurry',
        'bad_lighting',
        'partial_body',
        'selfie_for_bottom',
        'selfie_for_top_cropped',
        'no_face',
        'low_resolution',
        'target_region_occluded',
        'garment_unclear',
        'pose_mismatch',
        'uncertain'
      )
    );

alter table public.try_on_generations
  add column if not exists gate_signals jsonb;

alter table public.try_on_generations
  add column if not exists feedback_reason text
    check (
      feedback_reason is null
      or feedback_reason in (
        'face_didnt_look_like_me',
        'body_shape_changed',
        'clothing_looked_wrong',
        'image_not_realistic',
        'background_looked_bad',
        'other'
      )
    );

alter table public.try_on_generations
  add column if not exists tier_chosen text
    check (
      tier_chosen is null
      or tier_chosen in ('tier_a_premium', 'tier_b_economy', 'tier_c_gemini')
    );

alter table public.try_on_generations
  add column if not exists tier_effective text
    check (
      tier_effective is null
      or tier_effective in ('tier_a_premium', 'tier_b_economy', 'tier_c_gemini')
    );

-- Índice para o feedback dashboard (research §9.4): "gap ideal-vs-effective".
create index if not exists try_on_generations_tier_idx
  on public.try_on_generations (tier_chosen, tier_effective);

-- Índice para análise de rejeições do gate (research §9.3.3).
create index if not exists try_on_generations_gate_verdict_idx
  on public.try_on_generations (gate_verdict)
  where gate_verdict is not null;

comment on column public.try_on_generations.gate_verdict is
  'Veredito do quality gate (research §5). NULL = não rodado (legado).';
comment on column public.try_on_generations.gate_signals is
  'Signals brutos do quality gate — usados para A/B de thresholds (research §9.3.3).';
comment on column public.try_on_generations.feedback_reason is
  'Motivo estruturado quando feedback_positivo=false (research §9.2).';
comment on column public.try_on_generations.tier_chosen is
  'Tier ideal escolhido pelo router (chooseTier). Pode diferir do tier_effective quando Tier A/B estão desabilitados.';
comment on column public.try_on_generations.tier_effective is
  'Tier que efetivamente rodou. Hoje sempre tier_c_gemini.';

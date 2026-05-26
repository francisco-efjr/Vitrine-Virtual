-- =============================================================================
-- 20260526000014_quality_analytics_views.sql
--
-- Views analíticas para o loop de melhoria contínua da Cabine (research §9).
--
-- Lê `try_on_generations` (escrita pelo server) e entrega agregações prontas
-- para o dashboard do super-admin e para o utilitário calibrate.ts.
--
-- Todas as views são CREATE OR REPLACE — idempotentes, sem efeito em dados.
-- RLS nas views é herdada da tabela base (super-admin vê tudo, lojista só a
-- própria loja). Views não introduzem novos acessos.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. try_on_quality_summary
--    Taxa de aprovação por provider × model × tier, últimos 30 dias.
-- ---------------------------------------------------------------------------
create or replace view try_on_quality_summary as
select
  coalesce(provider::text, 'unknown')   as provider,
  coalesce(model_resolved, 'unknown')   as model_resolved,
  coalesce(tier_effective,  'unknown')  as tier_effective,
  count(*)                              as total,
  count(*) filter (where feedback_positivo is not null)  as with_feedback,
  count(*) filter (where feedback_positivo = true)       as positive,
  count(*) filter (where feedback_positivo = false)      as negative,
  round(
    count(*) filter (where feedback_positivo = true)::numeric
    / nullif(count(*) filter (where feedback_positivo is not null), 0)
    * 100,
    1
  )                                     as approval_rate_pct,
  round(avg(duration_ms)::numeric / 1000, 1) as avg_duration_s,
  count(*) filter (where status = 'error') as errors,
  min(created_at)                       as first_seen,
  max(created_at)                       as last_seen
from try_on_generations
where created_at > now() - interval '30 days'
group by provider, model_resolved, tier_effective;

comment on view try_on_quality_summary is
  'Taxa de aprovação por provider/model/tier, rolling 30 dias. Usado pelo calibrate.ts e dashboard super-admin.';

-- ---------------------------------------------------------------------------
-- 2. try_on_feedback_reasons
--    Quais razões de rejeição aparecem mais, rolling 30 dias.
-- ---------------------------------------------------------------------------
create or replace view try_on_feedback_reasons as
select
  coalesce(feedback_reason, 'not_specified') as reason,
  count(*)                                   as count,
  round(
    count(*) * 100.0 / nullif(sum(count(*)) over (), 0),
    1
  )                                          as pct_of_negative
from try_on_generations
where feedback_positivo = false
  and created_at > now() - interval '30 days'
group by feedback_reason
order by count desc;

comment on view try_on_feedback_reasons is
  'Distribuição das razões de rejeição (feedback_positivo=false), rolling 30 dias.';

-- ---------------------------------------------------------------------------
-- 3. try_on_gate_effectiveness
--    O gate_verdict prediz o feedback do usuário? Mede o quão bem o gate
--    discrimina gerações que o usuário vai rejeitar.
-- ---------------------------------------------------------------------------
create or replace view try_on_gate_effectiveness as
select
  coalesce(gate_verdict, 'not_evaluated') as gate_verdict,
  count(*)                                as total_with_feedback,
  count(*) filter (where feedback_positivo = true)  as positive,
  count(*) filter (where feedback_positivo = false) as negative,
  round(
    count(*) filter (where feedback_positivo = true)::numeric
    / nullif(count(*) filter (where feedback_positivo is not null), 0)
    * 100,
    1
  )                                       as approval_rate_pct
from try_on_generations
where feedback_positivo is not null
  and created_at > now() - interval '30 days'
group by gate_verdict
order by gate_verdict;

comment on view try_on_gate_effectiveness is
  'Aprovação do usuário segmentada por gate_verdict. Se "proceed_with_warning" tiver approval_rate muito menor que "proceed", o gate está bem calibrado.';

-- ---------------------------------------------------------------------------
-- 4. try_on_acceptance_vs_feedback
--    Cada acceptance check (checado = true) tem correlação com o feedback?
--    Agrupa por (check_name, passed) → mostra se pass=true realmente prediz
--    que o usuário vai aprovar o resultado.
-- ---------------------------------------------------------------------------
create or replace view try_on_acceptance_vs_feedback as
with checks as (
  select
    g.feedback_positivo,
    chk.value as chk
  from try_on_generations g,
  lateral jsonb_array_elements(
    g.generation_params -> 'acceptance' -> 'checks'
  ) as chk(value)
  where g.feedback_positivo is not null
    and g.generation_params -> 'acceptance' -> 'checks' is not null
    and jsonb_typeof(g.generation_params -> 'acceptance' -> 'checks') = 'array'
    and g.created_at > now() - interval '30 days'
)
select
  (chk ->> 'name')                    as check_name,
  (chk -> 'pass')::text::boolean      as passed,
  count(*)                            as total,
  count(*) filter (where feedback_positivo = true)  as user_positive,
  count(*) filter (where feedback_positivo = false) as user_negative,
  round(
    count(*) filter (where feedback_positivo = true)::numeric
    / nullif(count(*), 0) * 100,
    1
  )                                   as approval_rate_pct
from checks
where (chk -> 'checked')::text::boolean = true
group by chk ->> 'name', (chk -> 'pass')::text::boolean
order by check_name, passed;

comment on view try_on_acceptance_vs_feedback is
  'Para cada acceptance check real (checked=true): quando ele passa/falha, qual a aprovação do usuário? Se pass=false tiver approval bem menor, o check está correlacionado corretamente.';

-- ---------------------------------------------------------------------------
-- Índice adicional para consultas de calibração (extrai signals do JSONB)
-- Só cria se não existir — idempotente.
-- ---------------------------------------------------------------------------
create index if not exists try_on_generations_feedback_reason_idx
  on try_on_generations (feedback_reason)
  where feedback_reason is not null;

create index if not exists try_on_generations_gate_signals_idx
  on try_on_generations using gin (gate_signals)
  where gate_signals is not null;

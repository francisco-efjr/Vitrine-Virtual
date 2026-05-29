-- Scenarios dashboard view — research §4.3 P2.18.
--
-- Agrega contagem de cenários (mirror selfie, conflicting garment, age gate,
-- best-of-N triggers, retry, acceptance flags) a partir das colunas JSONB
-- já existentes em try_on_generations (gate_signals, generation_params).
--
-- Não-breaking: view só, sem alterar dados ou colunas. Read-only.

create or replace view public.try_on_scenarios_summary as
select
  date_trunc('day', g.created_at)::date as day,
  count(*) as total,
  count(*) filter (where (g.gate_signals -> 'mirror_selfie' ->> 'detected')::boolean) as mirror_selfie_count,
  count(*) filter (where (g.gate_signals -> 'conflicting_garment' ->> 'conflict')::boolean) as conflicting_garment_count,
  count(*) filter (where (g.gate_signals -> 'age_estimation' ->> 'bracket') = 'minor') as minor_estimated_count,
  count(*) filter (where (g.gate_signals -> 'age_estimation' ->> 'bracket') = 'uncertain') as uncertain_age_count,
  count(*) filter (where g.error_code = 'age_gate_consent_required') as age_gate_blocked_count,
  -- Acceptance flags do generation_params.acceptance.checks
  count(*) filter (
    where exists (
      select 1
      from jsonb_array_elements(coalesce(g.generation_params -> 'acceptance' -> 'checks', '[]'::jsonb)) c
      where c ->> 'name' = 'subjectCount' and (c ->> 'checked')::boolean and not (c ->> 'pass')::boolean
    )
  ) as subject_count_fail_count,
  count(*) filter (
    where exists (
      select 1
      from jsonb_array_elements(coalesce(g.generation_params -> 'acceptance' -> 'checks', '[]'::jsonb)) c
      where c ->> 'name' = 'anatomySanity' and (c ->> 'checked')::boolean and not (c ->> 'pass')::boolean
    )
  ) as anatomy_fail_count,
  count(*) filter (
    where exists (
      select 1
      from jsonb_array_elements(coalesce(g.generation_params -> 'acceptance' -> 'checks', '[]'::jsonb)) c
      where c ->> 'name' = 'identitySimilarity' and (c ->> 'checked')::boolean and not (c ->> 'pass')::boolean
    )
  ) as identity_fail_count,
  count(*) filter (
    where exists (
      select 1
      from jsonb_array_elements(coalesce(g.generation_params -> 'acceptance' -> 'checks', '[]'::jsonb)) c
      where c ->> 'name' = 'garmentColorFidelity' and (c ->> 'checked')::boolean and not (c ->> 'pass')::boolean
    )
  ) as color_fail_count,
  count(*) filter (
    where exists (
      select 1
      from jsonb_array_elements(coalesce(g.generation_params -> 'acceptance' -> 'checks', '[]'::jsonb)) c
      where c ->> 'name' = 'garmentTextFidelity' and (c ->> 'checked')::boolean and not (c ->> 'pass')::boolean
    )
  ) as text_fail_count,
  count(*) filter (
    where exists (
      select 1
      from jsonb_array_elements(coalesce(g.generation_params -> 'acceptance' -> 'checks', '[]'::jsonb)) c
      where c ->> 'name' = 'poseConsistency' and (c ->> 'checked')::boolean and not (c ->> 'pass')::boolean
    )
  ) as pose_fail_count,
  -- Retry telemetry
  count(*) filter (where g.generation_params -> 'retry' ->> 'reason' = 'retry_picked') as retry_picked_count,
  count(*) filter (where g.generation_params -> 'retry' ->> 'reason' = 'retry_rejected') as retry_rejected_count
from public.try_on_generations g
where g.created_at >= now() - interval '90 days'
group by date_trunc('day', g.created_at)::date
order by day desc;

comment on view public.try_on_scenarios_summary is
  'P2.18 — agregação por dia de cenários e flags pra dashboard de calibração no super-admin. Últimos 90 dias.';

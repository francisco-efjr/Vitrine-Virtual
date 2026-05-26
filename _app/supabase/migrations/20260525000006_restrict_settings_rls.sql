-- =============================================================================
-- Vitrine Virtual — Restringe system_settings a super_admin
--
-- PROBLEMA (information disclosure):
-- A policy anterior "settings_select" permitia que QUALQUER usuário autenticado
-- (incluindo lojistas comuns) lesse todas as system_settings, expondo:
--   - try_on_monthly_budget_usd  → custo operacional do negócio
--   - try_on_cost_per_generation_usd → estrutura de preço interno
--
-- CORREÇÃO:
-- Restringe SELECT para super_admin. Lojistas NÃO precisam ler system_settings
-- diretamente: o kill switch é verificado server-side via service_role em
-- isTryOnEnabled() — que usa createServiceClient(), não a sessão do lojista.
-- =============================================================================

drop policy if exists "settings_select" on public.system_settings;

-- Apenas super_admin pode ler configurações do sistema.
create policy "settings_select" on public.system_settings
  for select to authenticated
  using (public.is_super_admin());

-- As policies de write (insert/update/delete) já exigem is_super_admin() —
-- foram definidas em 20260426000005 e não precisam ser alteradas.

comment on table public.system_settings is
  'Configurações globais. Kill switch do try-on e orçamento mensal. Acesso restrito a super_admin.';

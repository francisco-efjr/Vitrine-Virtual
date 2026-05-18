-- =============================================================================
-- 20260517000011_add_google_try_on_provider.sql
--
-- Reconciliação: o banco remoto não tinha o valor 'google' no enum
-- try_on_provider, apesar de Google/Nano Banana ser o provider PRIMÁRIO
-- documentado. A migration local 20260427000006_google_ai_provider.sql
-- nunca foi aplicada no projeto remoto (histórico divergiu).
--
-- Sem 'google' no enum, gerações bem-sucedidas pelo provider primário
-- falham ao logar em try_on_uses (bug pré-existente) e em
-- try_on_generations (base de qualidade — ADR 0009).
--
-- Idempotente e aditivo (não-breaking). Aplicada no remoto em 2026-05-17.
-- =============================================================================

alter type public.try_on_provider add value if not exists 'google';

-- =============================================================================
-- Vitrine Virtual — OpenAI provider
-- =============================================================================

-- 1. Adiciona 'openai' ao enum try_on_provider
ALTER TYPE public.try_on_provider ADD VALUE IF NOT EXISTS 'openai';

-- 2. Garante que o bucket try-on-results existe (pode ter sido criado na migration 006).
--    on conflict do nothing — seguro rodar mais de uma vez.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'try-on-results',
  'try-on-results',
  false,
  10485760,  -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

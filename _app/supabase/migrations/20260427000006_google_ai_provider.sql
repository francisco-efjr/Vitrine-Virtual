-- =============================================================================
-- Vitrine Virtual — Google AI provider + try-on-results bucket
-- =============================================================================

-- 1. Adiciona 'google' ao enum try_on_provider
ALTER TYPE public.try_on_provider ADD VALUE IF NOT EXISTS 'google';

-- 2. Bucket privado para resultados gerados pelo Google AI (Gemini).
--    TTL lógico de 24h — a URL assinada expira, o blob pode ser limpo por cron.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'try-on-results',
  'try-on-results',
  false,
  10485760,  -- 10 MB (PNG gerado pelo Gemini pode ser maior)
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Apenas service_role acessa o bucket (servidor lê/escreve, usuário nunca acessa direto).
-- Nenhuma policy RLS de usuário — acesso exclusivo via service role key.
-- A URL retornada ao cliente é uma signed URL gerada pelo servidor (TTL 24h).

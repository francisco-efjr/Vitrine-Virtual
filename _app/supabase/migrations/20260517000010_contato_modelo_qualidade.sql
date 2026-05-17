-- =============================================================================
-- 20260517000010_contato_modelo_qualidade.sql
--
-- Implementa o handoff "Admin & Super Admin" (Vitrine Virtual.html):
--
--   1. lojas.ai_image_model           — modelo de imagem por loja: 'high' | 'medium'
--   2. contact_clicks                 — registra cada clique nos botões de contato
--                                       (Instagram / TikTok / WhatsApp) da vitrine
--   3. try_on_generations             — base de aprendizado de qualidade: armazena
--                                       metadados de cada geração + feedback opcional
--   4. bucket try-on-customer-photos  — foto do cliente persistida para análise
--                                       (decisão do PO — ver ADR 0009, substitui 0006)
--   5. system_settings.default_ai_image_model — modelo padrão de novas lojas
--
-- Tudo com defaults seguros e NULL onde aplicável → migração não-breaking.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Modelo de imagem por loja
-- -----------------------------------------------------------------------------
alter table public.lojas
  add column if not exists ai_image_model text not null default 'medium'
    check (ai_image_model in ('high', 'medium'));

comment on column public.lojas.ai_image_model is
  'Qualidade do modelo de imagem usado na Cabine desta loja. high=GOOGLE_AI_MODEL, medium=GOOGLE_AI_FALLBACK_MODEL. Nome técnico nunca exposto na UI.';

-- Modelo padrão aplicado a novas lojas (Super-Admin → Controles do sistema).
insert into public.system_settings (key, value) values
  ('default_ai_image_model', '"medium"'::jsonb)
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- 2. contact_clicks — intenção de contato por loja
-- -----------------------------------------------------------------------------
create table if not exists public.contact_clicks (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references public.lojas(id) on delete cascade,
  channel       text not null check (channel in ('instagram', 'tiktok', 'whatsapp')),
  session_id    text check (session_id is null or length(session_id) <= 128),
  visitor_id    text check (visitor_id is null or length(visitor_id) <= 128),
  user_agent    text check (user_agent is null or length(user_agent) <= 512),
  referrer      text check (referrer is null or length(referrer) <= 1024),
  device_type   text check (device_type is null or device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  ip_hash       text check (ip_hash is null or length(ip_hash) between 16 and 128),
  created_at    timestamptz not null default now()
);

comment on table public.contact_clicks is
  'Um registro por clique em botão de contato da vitrine pública que redireciona para canal externo. IP sempre hasheado (LGPD).';

create index if not exists contact_clicks_loja_created_idx
  on public.contact_clicks (loja_id, created_at desc);
create index if not exists contact_clicks_loja_channel_idx
  on public.contact_clicks (loja_id, channel);
create index if not exists contact_clicks_created_idx
  on public.contact_clicks (created_at desc);

-- -----------------------------------------------------------------------------
-- 3. try_on_generations — base de aprendizado de qualidade de imagem
--    ADR 0009 (substitui 0006): passamos a armazenar a foto do cliente e o
--    resultado para análise/melhoria contínua. Acesso só via service role /
--    super-admin. Termo de privacidade deve refletir esta retenção.
-- -----------------------------------------------------------------------------
create table if not exists public.try_on_generations (
  id                       uuid primary key default gen_random_uuid(),
  loja_id                  uuid not null references public.lojas(id) on delete cascade,
  peca_id                  uuid references public.pecas(id) on delete set null,
  user_id                  uuid references auth.users(id) on delete set null,
  session_id               text,
  ip_hash                  text check (ip_hash is null or length(ip_hash) between 16 and 128),
  -- entradas
  customer_photo_path      text,                       -- bucket try-on-customer-photos
  product_image_path       text,                       -- bucket pecas-fotos (quando disponível)
  -- modelo / parâmetros
  ai_image_model           text check (ai_image_model is null or ai_image_model in ('high', 'medium')),
  model_resolved           text,                       -- ex: gemini-3.1-flash-image-preview
  provider                 public.try_on_provider,
  provider_request_id      text,
  final_prompt             text,
  generation_params        jsonb,
  -- saída
  result_bucket            text,
  result_path              text,
  status                   text not null default 'success'
                           check (status in ('success', 'error', 'fallback')),
  error_code               text,
  duration_ms              int,
  created_at               timestamptz not null default now(),
  -- feedback opcional do cliente (minimalista, não obrigatório)
  feedback_positivo        boolean,
  feedback_comentario      text check (feedback_comentario is null or length(feedback_comentario) <= 1000),
  feedback_at              timestamptz
);

comment on table public.try_on_generations is
  'Base de aprendizado de qualidade da Cabine. Um registro por geração com prompt, parâmetros, modelo e feedback opcional. ADR 0009.';

create index if not exists try_on_generations_loja_created_idx
  on public.try_on_generations (loja_id, created_at desc);
create index if not exists try_on_generations_model_idx
  on public.try_on_generations (ai_image_model, model_resolved);
create index if not exists try_on_generations_feedback_idx
  on public.try_on_generations (feedback_positivo)
  where feedback_positivo is not null;

-- -----------------------------------------------------------------------------
-- 4. Bucket privado para a foto do cliente (análise de qualidade — ADR 0009)
--    Apenas service_role acessa. Nenhuma policy RLS de usuário.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'try-on-customer-photos',
  'try-on-customer-photos',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 5. RLS — leitura restrita; escrita só via service role (rotas server-side)
-- -----------------------------------------------------------------------------
alter table public.contact_clicks      enable row level security;
alter table public.try_on_generations  enable row level security;

-- Super-admin vê tudo; lojista vê apenas da própria loja.
create policy "contact_clicks_select" on public.contact_clicks
  for select using (
    loja_id = public.current_user_loja_id() or public.is_super_admin()
  );

create policy "try_on_generations_select" on public.try_on_generations
  for select using (
    loja_id = public.current_user_loja_id() or public.is_super_admin()
  );

-- INSERT/UPDATE acontecem exclusivamente via service_role (bypassa RLS):
--   • /api/track/contact  → contact_clicks
--   • /api/try-on         → try_on_generations
--   • /api/try-on/feedback→ try_on_generations (update do feedback)
-- Não criamos policy de insert/update para anon/authenticated de propósito.

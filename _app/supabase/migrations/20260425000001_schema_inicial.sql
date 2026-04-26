-- =============================================================================
-- Vitrine Virtual — schema inicial
-- ADRs: 0001 (stack), 0003 (super-admin), 0005 (multi-tenancy via RLS),
--       0006 (privacidade da foto do cliente final)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

create type public.user_role as enum ('lojista', 'super_admin');
create type public.peca_status as enum ('disponivel', 'vendida');
create type public.try_on_provider as enum ('fashn', 'replicate');

-- -----------------------------------------------------------------------------
-- profiles (extensão de auth.users)
-- -----------------------------------------------------------------------------

create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            public.user_role not null default 'lojista',
  nome_completo   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil estendido de auth.users. Define se o usuário é lojista comum ou super-admin (Francisco).';

-- Cria perfil automaticamente quando um usuário é criado em auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome_completo)
  values (new.id, new.raw_user_meta_data->>'nome_completo');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- lojas
-- -----------------------------------------------------------------------------

create table public.lojas (
  id                      uuid primary key default gen_random_uuid(),
  owner_user_id           uuid not null unique references auth.users(id) on delete restrict,
  slug                    text not null unique
                          check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60),
  nome                    text not null check (length(nome) between 1 and 80),
  logo_storage_path       text,
  instagram               text check (instagram is null or length(instagram) <= 50),
  tiktok                  text check (tiktok is null or length(tiktok) <= 50),
  whatsapp_e164           text check (whatsapp_e164 is null or whatsapp_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  exibir_preco_publico    boolean not null default false,
  cota_try_on_mensal      int not null default 200 check (cota_try_on_mensal >= 0),
  ativa                   boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.lojas is
  'Cada loja é um tenant. owner_user_id é único (1 lojista = 1 loja no MVP).';

create index lojas_owner_idx on public.lojas (owner_user_id);
create index lojas_slug_idx on public.lojas (slug);

-- -----------------------------------------------------------------------------
-- pecas
-- -----------------------------------------------------------------------------

create table public.pecas (
  id                  uuid primary key default gen_random_uuid(),
  loja_id             uuid not null references public.lojas(id) on delete cascade,
  nome                text not null check (length(nome) between 1 and 100),
  preco_centavos      int check (preco_centavos is null or preco_centavos >= 0),
  tamanho             text check (tamanho is null or length(tamanho) <= 60),
  status              public.peca_status not null default 'disponivel',
  foto_principal_id   uuid,
  vendida_em          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- consistência: vendida_em só faz sentido quando status=vendida
  constraint pecas_vendida_em_consistente
    check ((status = 'vendida' and vendida_em is not null) or (status = 'disponivel' and vendida_em is null))
);

comment on table public.pecas is 'Peças cadastradas por cada loja. Preço e tamanho opcionais.';

create index pecas_loja_idx on public.pecas (loja_id);
create index pecas_loja_status_idx on public.pecas (loja_id, status);
create index pecas_loja_created_idx on public.pecas (loja_id, created_at desc);

-- -----------------------------------------------------------------------------
-- pecas_fotos
-- -----------------------------------------------------------------------------

create table public.pecas_fotos (
  id              uuid primary key default gen_random_uuid(),
  peca_id         uuid not null references public.pecas(id) on delete cascade,
  storage_path    text not null,
  ordem           int not null default 0,
  created_at      timestamptz not null default now()
);

comment on table public.pecas_fotos is
  'Fotos das peças no Supabase Storage (bucket pecas-fotos). Path: {loja_id}/{peca_id}/{uuid}.{ext}';

create index pecas_fotos_peca_idx on public.pecas_fotos (peca_id);

-- FK retroativa: peca.foto_principal_id -> pecas_fotos.id
alter table public.pecas
  add constraint pecas_foto_principal_fk
  foreign key (foto_principal_id) references public.pecas_fotos(id) on delete set null;

-- -----------------------------------------------------------------------------
-- try_on_uses (log para cota mensal e auditoria)
-- ADR 0006: nunca armazenamos a foto. Aqui só metadados, com IP hasheado.
-- -----------------------------------------------------------------------------

create table public.try_on_uses (
  id                    uuid primary key default gen_random_uuid(),
  loja_id               uuid not null references public.lojas(id) on delete cascade,
  peca_id               uuid not null references public.pecas(id) on delete cascade,
  ip_hash               text not null check (length(ip_hash) between 16 and 128),
  session_id            text,
  success               boolean not null,
  provider              public.try_on_provider,
  provider_request_id   text,
  error_code            text,
  duration_ms           int,
  created_at            timestamptz not null default now()
);

comment on table public.try_on_uses is
  'Log de cada chamada do provador IA. ADR 0006: nunca armazenamos a foto. ip_hash é SHA-256(ip+salt).';

create index try_on_uses_loja_created_idx on public.try_on_uses (loja_id, created_at desc);
create index try_on_uses_loja_month_idx on public.try_on_uses (loja_id, date_trunc('month', created_at));

-- -----------------------------------------------------------------------------
-- system_settings (kill switch global e outros flags)
-- -----------------------------------------------------------------------------

create table public.system_settings (
  key             text primary key,
  value           jsonb not null,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users(id)
);

comment on table public.system_settings is 'Configurações globais. Kill switch do try-on vive aqui.';

-- Defaults
insert into public.system_settings (key, value) values
  ('try_on_enabled', 'true'::jsonb),
  ('try_on_monthly_budget_usd', '100'::jsonb),
  ('try_on_cost_per_generation_usd', '0.06'::jsonb);

-- -----------------------------------------------------------------------------
-- updated_at trigger genérico
-- -----------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger lojas_touch before update on public.lojas
  for each row execute function public.touch_updated_at();
create trigger pecas_touch before update on public.pecas
  for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.system_settings
  for each row execute function public.touch_updated_at();

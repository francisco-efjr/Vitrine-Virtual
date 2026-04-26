-- =============================================================================
-- Vitrine Virtual — RLS policies (defesa em profundidade)
-- ADR 0005: multi-tenancy via Row Level Security do PostgreSQL.
-- =============================================================================

-- Helpers ---------------------------------------------------------------------

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

comment on function public.is_super_admin() is
  'Retorna true se o usuário autenticado é super-admin. Usado nas RLS policies.';

create or replace function public.current_user_loja_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.lojas where owner_user_id = auth.uid() limit 1;
$$;

-- Habilitar RLS em todas as tabelas tenant-aware -------------------------------

alter table public.profiles        enable row level security;
alter table public.lojas           enable row level security;
alter table public.pecas           enable row level security;
alter table public.pecas_fotos     enable row level security;
alter table public.try_on_uses     enable row level security;
alter table public.system_settings enable row level security;

-- profiles --------------------------------------------------------------------

create policy "profiles_self_select" on public.profiles
  for select using (id = auth.uid() or public.is_super_admin());

create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles_super_admin_all" on public.profiles
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- lojas -----------------------------------------------------------------------

create policy "lojas_owner_select" on public.lojas
  for select using (owner_user_id = auth.uid() or public.is_super_admin());

create policy "lojas_owner_update" on public.lojas
  for update using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- INSERT/DELETE só super-admin (onboarding manual — ADR 0003)
create policy "lojas_super_admin_insert" on public.lojas
  for insert with check (public.is_super_admin());

create policy "lojas_super_admin_delete" on public.lojas
  for delete using (public.is_super_admin());

create policy "lojas_super_admin_update" on public.lojas
  for update using (public.is_super_admin())
  with check (public.is_super_admin());

-- pecas -----------------------------------------------------------------------

create policy "pecas_owner_select" on public.pecas
  for select using (
    loja_id = public.current_user_loja_id() or public.is_super_admin()
  );

create policy "pecas_owner_insert" on public.pecas
  for insert with check (loja_id = public.current_user_loja_id());

create policy "pecas_owner_update" on public.pecas
  for update using (loja_id = public.current_user_loja_id())
  with check (loja_id = public.current_user_loja_id());

create policy "pecas_owner_delete" on public.pecas
  for delete using (loja_id = public.current_user_loja_id());

create policy "pecas_super_admin_all" on public.pecas
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- pecas_fotos -----------------------------------------------------------------

create policy "pecas_fotos_owner_select" on public.pecas_fotos
  for select using (
    exists (
      select 1 from public.pecas p
      where p.id = pecas_fotos.peca_id
        and (p.loja_id = public.current_user_loja_id() or public.is_super_admin())
    )
  );

create policy "pecas_fotos_owner_insert" on public.pecas_fotos
  for insert with check (
    exists (
      select 1 from public.pecas p
      where p.id = pecas_fotos.peca_id
        and p.loja_id = public.current_user_loja_id()
    )
  );

create policy "pecas_fotos_owner_delete" on public.pecas_fotos
  for delete using (
    exists (
      select 1 from public.pecas p
      where p.id = pecas_fotos.peca_id
        and p.loja_id = public.current_user_loja_id()
    )
  );

-- try_on_uses -----------------------------------------------------------------
-- Apenas super-admin pode SELECT logs. INSERT é via service_role na rota /api/try-on.
create policy "try_on_uses_owner_select" on public.try_on_uses
  for select using (
    loja_id = public.current_user_loja_id() or public.is_super_admin()
  );

-- system_settings -------------------------------------------------------------
-- Read: público autenticado pode ler (precisa para checagem do kill switch no front).
-- Write: apenas super-admin.
create policy "settings_read_authenticated" on public.system_settings
  for select using (auth.uid() is not null);

create policy "settings_super_admin_write" on public.system_settings
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- Otimização de RLS e índices conforme advisors do Supabase.
-- 1. Trocar auth.uid() por (select auth.uid()) — evita re-avaliar por row.
-- 2. Unificar policies "owner OR super_admin" em uma única policy por ação.
-- 3. Indexar FKs faltantes.

-- ========================================================================
-- profiles
-- ========================================================================
drop policy if exists "profiles_self_select" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;
drop policy if exists "profiles_super_admin_all" on public.profiles;

create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_super_admin());

create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_super_admin())
  with check (id = (select auth.uid()) or public.is_super_admin());

create policy "profiles_super_admin_insert" on public.profiles
  for insert to authenticated
  with check (public.is_super_admin());

create policy "profiles_super_admin_delete" on public.profiles
  for delete to authenticated
  using (public.is_super_admin());

-- ========================================================================
-- lojas
-- ========================================================================
drop policy if exists "lojas_owner_select" on public.lojas;
drop policy if exists "lojas_owner_update" on public.lojas;
drop policy if exists "lojas_super_admin_insert" on public.lojas;
drop policy if exists "lojas_super_admin_delete" on public.lojas;
drop policy if exists "lojas_super_admin_update" on public.lojas;

create policy "lojas_select" on public.lojas
  for select to authenticated
  using (owner_user_id = (select auth.uid()) or public.is_super_admin());

create policy "lojas_update" on public.lojas
  for update to authenticated
  using (owner_user_id = (select auth.uid()) or public.is_super_admin())
  with check (owner_user_id = (select auth.uid()) or public.is_super_admin());

create policy "lojas_insert" on public.lojas
  for insert to authenticated
  with check (public.is_super_admin());

create policy "lojas_delete" on public.lojas
  for delete to authenticated
  using (public.is_super_admin());

-- ========================================================================
-- pecas
-- ========================================================================
drop policy if exists "pecas_owner_select" on public.pecas;
drop policy if exists "pecas_owner_insert" on public.pecas;
drop policy if exists "pecas_owner_update" on public.pecas;
drop policy if exists "pecas_owner_delete" on public.pecas;
drop policy if exists "pecas_super_admin_all" on public.pecas;

create policy "pecas_select" on public.pecas
  for select to authenticated
  using (loja_id = public.current_user_loja_id() or public.is_super_admin());

create policy "pecas_insert" on public.pecas
  for insert to authenticated
  with check (loja_id = public.current_user_loja_id() or public.is_super_admin());

create policy "pecas_update" on public.pecas
  for update to authenticated
  using (loja_id = public.current_user_loja_id() or public.is_super_admin())
  with check (loja_id = public.current_user_loja_id() or public.is_super_admin());

create policy "pecas_delete" on public.pecas
  for delete to authenticated
  using (loja_id = public.current_user_loja_id() or public.is_super_admin());

-- ========================================================================
-- pecas_fotos
-- ========================================================================
drop policy if exists "pecas_fotos_owner_select" on public.pecas_fotos;
drop policy if exists "pecas_fotos_owner_insert" on public.pecas_fotos;
drop policy if exists "pecas_fotos_owner_delete" on public.pecas_fotos;

create policy "pecas_fotos_select" on public.pecas_fotos
  for select to authenticated
  using (
    public.is_super_admin() or exists (
      select 1 from public.pecas p
      where p.id = pecas_fotos.peca_id
        and p.loja_id = public.current_user_loja_id()
    )
  );

create policy "pecas_fotos_insert" on public.pecas_fotos
  for insert to authenticated
  with check (
    public.is_super_admin() or exists (
      select 1 from public.pecas p
      where p.id = pecas_fotos.peca_id
        and p.loja_id = public.current_user_loja_id()
    )
  );

create policy "pecas_fotos_delete" on public.pecas_fotos
  for delete to authenticated
  using (
    public.is_super_admin() or exists (
      select 1 from public.pecas p
      where p.id = pecas_fotos.peca_id
        and p.loja_id = public.current_user_loja_id()
    )
  );

-- ========================================================================
-- try_on_uses
-- ========================================================================
drop policy if exists "try_on_uses_owner_select" on public.try_on_uses;

create policy "try_on_uses_select" on public.try_on_uses
  for select to authenticated
  using (loja_id = public.current_user_loja_id() or public.is_super_admin());

-- ========================================================================
-- system_settings
-- ========================================================================
drop policy if exists "settings_read_authenticated" on public.system_settings;
drop policy if exists "settings_super_admin_write" on public.system_settings;

create policy "settings_select" on public.system_settings
  for select to authenticated
  using ((select auth.uid()) is not null);

create policy "settings_insert" on public.system_settings
  for insert to authenticated
  with check (public.is_super_admin());

create policy "settings_update" on public.system_settings
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "settings_delete" on public.system_settings
  for delete to authenticated
  using (public.is_super_admin());

-- ========================================================================
-- Índices em FKs faltantes
-- ========================================================================
create index if not exists pecas_foto_principal_idx
  on public.pecas (foto_principal_id) where foto_principal_id is not null;
create index if not exists try_on_uses_peca_idx on public.try_on_uses (peca_id);
create index if not exists system_settings_updated_by_idx
  on public.system_settings (updated_by) where updated_by is not null;

-- ========================================================================
-- search_path imutável em touch_updated_at
-- ========================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ========================================================================
-- Bucket lojas-logos: remover policy de SELECT broad (permite LIST de tudo).
-- Bucket público serve objetos via URL direta sem precisar de SELECT broad.
-- ========================================================================
drop policy if exists "lojas_logos_public_read" on storage.objects;

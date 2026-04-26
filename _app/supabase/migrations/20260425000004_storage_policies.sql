-- =============================================================================
-- Vitrine Virtual — Storage buckets + policies
-- =============================================================================

-- Bucket privado de fotos das peças.
-- Estrutura de path: {loja_id}/{peca_id}/{uuid}.{ext}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pecas-fotos',
  'pecas-fotos',
  false,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Bucket público de logos das lojas.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lojas-logos',
  'lojas-logos',
  true,
  2097152,  -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- ----- pecas-fotos: read/write apenas pelo dono da loja --------------------

create policy "pecas_fotos_owner_read" on storage.objects
  for select using (
    bucket_id = 'pecas-fotos'
    and (storage.foldername(name))[1]::uuid = public.current_user_loja_id()
  );

create policy "pecas_fotos_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'pecas-fotos'
    and (storage.foldername(name))[1]::uuid = public.current_user_loja_id()
  );

create policy "pecas_fotos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'pecas-fotos'
    and (storage.foldername(name))[1]::uuid = public.current_user_loja_id()
  );

create policy "pecas_fotos_super_admin_all" on storage.objects
  for all using (bucket_id = 'pecas-fotos' and public.is_super_admin())
  with check (bucket_id = 'pecas-fotos' and public.is_super_admin());

-- ----- lojas-logos: read público, write apenas pelo dono ------------------

create policy "lojas_logos_public_read" on storage.objects
  for select using (bucket_id = 'lojas-logos');

create policy "lojas_logos_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'lojas-logos'
    and (storage.foldername(name))[1]::uuid = public.current_user_loja_id()
  );

create policy "lojas_logos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'lojas-logos'
    and (storage.foldername(name))[1]::uuid = public.current_user_loja_id()
  );

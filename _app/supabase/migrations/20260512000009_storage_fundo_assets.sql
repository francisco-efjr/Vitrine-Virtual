-- =============================================================================
-- 20260512000009_storage_fundo_assets.sql
--
-- Corrige duas regressões reportadas em QA no upload de assets da loja:
--
--   1. Bucket `lojas-logos` tinha file_size_limit=2MB. Como o cliente
--      standardiza imagens para WebP até ~2MB, qualquer foto de fundo
--      ligeiramente acima do alvo (comum em screenshots ou exports HEIC
--      mal compactados) falhava no upload com 413 do Storage. Aumentamos
--      para 10MB, alinhado com o limite usado em `pecas-fotos`.
--
--   2. O bucket pode não existir em ambientes que rodaram migrations
--      antigas e não foram resetados — recria o INSERT idempotente com
--      ON CONFLICT DO UPDATE para garantir a config correta em qualquer
--      estado anterior.
--
-- Sem este fix, o upload de fundo do provador da configuração da loja
-- falha silenciosamente do lado do servidor (erro genérico).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lojas-logos',
  'lojas-logos',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Garante que o bucket de fotos de peças também aceita 10MB (estava em 5MB,
-- e o cliente pode enviar arquivos pouco maiores antes da compressão final).
update storage.buckets
set file_size_limit = 10485760
where id = 'pecas-fotos'
  and file_size_limit < 10485760;

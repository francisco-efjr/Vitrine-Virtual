-- Adiciona a opção 'cliente' ao tipo de fundo do provador.
-- 'cliente' = usa o fundo da própria foto enviada pelo cliente, em vez de
-- aplicar um fundo branco ou personalizado da loja.

alter table public.lojas
  drop constraint if exists lojas_provador_fundo_tipo_check;

alter table public.lojas
  add constraint lojas_provador_fundo_tipo_check
    check (provador_fundo_tipo in ('branco', 'personalizado', 'cliente'));

comment on column public.lojas.provador_fundo_tipo is
  'branco | personalizado | cliente — onde "cliente" preserva o fundo da própria foto enviada pelo cliente.';

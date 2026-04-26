-- =============================================================================
-- Seed local — dados de desenvolvimento.
-- Roda automaticamente em `supabase db reset`.
-- NÃO é executado em produção.
-- =============================================================================

-- Cria um super-admin de dev (a senha do usuário é definida via Supabase Auth seed
-- ou criada manualmente pelo Studio em http://localhost:54323).
-- Para testar localmente, crie um usuário em Auth > Users com seu e-mail e depois
-- atualize role:
--   update public.profiles set role = 'super_admin' where id = (select id from auth.users where email = 'francisco.efjr@gmail.com');

-- Loja-exemplo (apenas se já existir um usuário com perfil)
do $$
declare
  v_user_id uuid;
  v_loja_id uuid;
begin
  select id into v_user_id from auth.users limit 1;
  if v_user_id is not null then
    insert into public.lojas (owner_user_id, slug, nome, instagram, whatsapp_e164, exibir_preco_publico)
    values (v_user_id, 'atelier-laila', 'Atelier Laila', 'atelierlaila', '+5511998765432', false)
    on conflict (owner_user_id) do nothing
    returning id into v_loja_id;

    if v_loja_id is not null then
      insert into public.pecas (loja_id, nome, preco_centavos, tamanho, status) values
        (v_loja_id, 'Blusa de Linho Branca', 8900, 'P, M, G', 'disponivel'),
        (v_loja_id, 'Calça Wide Leg Bege', 14900, '36, 38, 40', 'disponivel'),
        (v_loja_id, 'Vestido Midi Floral', 18900, 'P, M', 'disponivel'),
        (v_loja_id, 'Cardigan Tricô Caramelo', 12900, 'Único', 'vendida'),
        (v_loja_id, 'Shorts Jeans Vintage', 7900, '36, 38', 'disponivel');

      update public.pecas set vendida_em = now()
        where loja_id = v_loja_id and status = 'vendida';
    end if;
  end if;
end $$;

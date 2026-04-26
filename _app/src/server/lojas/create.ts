import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { lojaCreateSchema, type LojaCreateInput } from '@/lib/validators/loja'
import { logger } from '@/lib/logger'
import { getPublicEnv } from '@/lib/env'
import {
  EmailJaCadastradoError,
  LojaError,
  SlugIndisponivelError,
} from './errors'
import { isReservedSlug, isSlugAvailable } from './slug'
import type { LojaRow } from '@/types/database'

/**
 * Cria uma loja + usuário lojista de uma vez (super-admin only).
 * - Valida payload com Zod.
 * - Confere slug disponível e não reservado.
 * - Cria usuário em auth.users via Admin API (sem senha — magic link define depois).
 * - Cria registro em public.lojas (vinculado ao novo usuário).
 * - Envia magic link de "definir senha" via Supabase Auth.
 *
 * Retorna { loja, invitationSent }.
 *
 * Caller deve garantir que requireSuperAdmin() já foi chamado.
 */
export async function createLojaWithInvite(
  input: LojaCreateInput,
): Promise<{ loja: LojaRow; invitationSent: boolean }> {
  const data = lojaCreateSchema.parse(input)

  if (isReservedSlug(data.slug)) throw SlugIndisponivelError()
  if (!(await isSlugAvailable(data.slug))) throw SlugIndisponivelError()

  const admin = createServiceClient()
  const env = getPublicEnv()

  // 1. Verifica se já existe usuário com esse e-mail
  // (Supabase Auth não tem .getUserByEmail no SDK público — listUsers é a rota oficial)
  const { data: existingList, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  })
  if (listError) {
    logger.error('Erro ao listar usuários ao criar loja', { code: listError.message })
    throw new LojaError('Falha ao verificar e-mail', 'LIST_USERS_FAIL', 500)
  }
  const found = existingList.users.find((u) => u.email?.toLowerCase() === data.email)

  let userId: string
  let invitationSent = false

  if (found) {
    // já existe — checa se já é dono de alguma loja
    const { data: lojaExist } = await admin
      .from('lojas')
      .select('id')
      .eq('owner_user_id', found.id)
      .maybeSingle()
    if (lojaExist) throw EmailJaCadastradoError()
    userId = found.id
  } else {
    // 2. Cria usuário via inviteUserByEmail (envia magic link automaticamente)
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      data.email,
      {
        redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/admin/definir-senha`,
        data: { nome_loja: data.nome },
      },
    )
    if (inviteError || !invited.user) {
      logger.error('Erro ao convidar usuário', { code: inviteError?.message })
      throw new LojaError('Falha ao enviar convite', 'INVITE_FAIL', 500)
    }
    userId = invited.user.id
    invitationSent = true
  }

  // 3. Cria registro em public.lojas
  const { data: loja, error: lojaError } = await admin
    .from('lojas')
    .insert({
      owner_user_id: userId,
      slug: data.slug,
      nome: data.nome,
      cota_try_on_mensal: data.cota_try_on_mensal,
    })
    .select('*')
    .single()

  if (lojaError || !loja) {
    logger.error('Erro ao criar registro de loja', { code: lojaError?.message })
    // Tenta rollback do usuário se foi recém-criado
    if (invitationSent) {
      await admin.auth.admin.deleteUser(userId).catch(() => {})
    }
    if (lojaError?.code === '23505') throw EmailJaCadastradoError()
    throw new LojaError('Falha ao criar loja', 'INSERT_FAIL', 500)
  }

  logger.info('Loja criada com sucesso', { loja_id: loja.id, slug: loja.slug, invitationSent })

  return { loja, invitationSent }
}

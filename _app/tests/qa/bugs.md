# Registro de Bugs — Vitrine Virtual

> **Sessão de QA:** 27/04/2026  
> **Testador:** Claude (QA Especialista)  
> **Método:** Análise estática do código-fonte + inspeção do banco via Supabase MCP + observação da UI em execução  
> **Credenciais testadas:** Super-admin `francisco.efjr@gmail.com / 123` · Lojista `teste@me.com / 123`

---

## Legenda de Severidade

| Código | Severidade | Critério |
|--------|-----------|----------|
| P0 | **Crítico** | Funcionalidade totalmente quebrada; afeta fluxo principal |
| P1 | **Alto** | Comportamento incorreto visível; afeta integridade de dados |
| P2 | **Médio** | Problema de UX ou lógica que pode enganar o usuário |
| P3 | **Baixo** | Qualidade de código, inconsistência visual ou técnica |

---

## BUG-001 — P0: Botão "Salvar" do orçamento não tem onClick

**Arquivo:** `src/app/(admin)/admin/super/super-client.tsx`  
**Linha:** 149  
**Componente:** `SuperAdminClient`

**Código problemático:**
```tsx
<Button variant="dark">Salvar</Button>
```

**Impacto:** O campo de orçamento mensal de IA (US$) pode ser editado visualmente, mas clicar em "Salvar" não dispara nenhuma ação. O valor digitado é perdido ao recarregar a página. O controle de gastos do provador IA nunca é atualizado via UI.

**Reprodução:**
1. Acessar `/admin/super`
2. Alterar o valor no campo "Orçamento mensal total de IA"
3. Clicar em "Salvar"
4. Recarregar a página → valor volta para o original

**Correção:**
```tsx
async function saveBudget() {
  await fetch('/api/super-admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ try_on_monthly_budget_usd: parseFloat(budget) }),
  })
}

// Na linha 149:
<Button variant="dark" onClick={saveBudget}>Salvar</Button>
```

> ⚠️ Ver também BUG-002 — o endpoint de settings também não persiste o budget.

---

## BUG-002 — P0: API de settings aceita budget mas não o persiste no banco

**Arquivo:** `src/app/api/super-admin/settings/route.ts`  
**Linhas:** 7–10 (schema) e 26–29 (handler)

**Código problemático:**
```typescript
const patchSchema = z.object({
  try_on_enabled: z.boolean().optional(),
  try_on_monthly_budget_usd: z.number().positive().optional(), // aceito no schema...
})

export async function PATCH(req: NextRequest) {
  return handleRoute(async () => {
    const session = await requireSuperAdmin()
    const body = patchSchema.parse(await req.json())
    if (typeof body.try_on_enabled === 'boolean') {
      await setTryOnEnabled(body.try_on_enabled, session.user.id)
    }
    // ...mas try_on_monthly_budget_usd nunca é processado!
    return { ok: true }
  })
}
```

**Impacto:** Mesmo que o botão "Salvar" tivesse onClick (ver BUG-001), o orçamento nunca seria salvo no banco. O endpoint retorna `{ ok: true }` enganosamente. O mecanismo de kill switch automático por orçamento (citado no `kill-switch.ts`) nunca recebe o teto correto.

**Correção:**
```typescript
// Adicionar em kill-switch.ts:
export async function setBudget(usd: number): Promise<void> {
  const supabase = createServiceClient()
  await supabase.from('system_settings').upsert({ key: 'try_on_monthly_budget_usd', value: usd })
}

// Adicionar no PATCH handler (settings/route.ts):
if (typeof body.try_on_monthly_budget_usd === 'number') {
  await setBudget(body.try_on_monthly_budget_usd)
}
```

---

## BUG-003 — P0: Email lookup truncado na criação de loja (perPage: 1)

**Arquivo:** `src/server/lojas/create.ts`  
**Linhas:** 39–41 e 47

**Código problemático:**
```typescript
const { data: existingList, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1,  // ← busca apenas 1 usuário de todos
})
const found = existingList.users.find((u) => u.email?.toLowerCase() === data.email)
```

**Impacto:** `listUsers` com `perPage: 1` retorna somente o primeiro usuário cadastrado. O `find()` percorre apenas esse array de 1 item. Com 5 usuários no sistema (estado atual), e-mails dos usuários 2–5 seriam considerados "não cadastrados". Resultado: é possível criar uma segunda loja para um e-mail já existente, corrompendo o modelo de dados (um usuário com duas lojas quebra a lógica RLS que assume 1:1).

**Evidência:** Banco atual tem 5 usuários auth. Sistema conseguiria criar loja para `teste@me.com`, `junioredsonnn@gmail.com`, `espacomodas@gmail.com` ou `bella@store.com` sem detectar duplicata.

**Correção:**
```typescript
// Opção A: buscar por e-mail diretamente (mais eficiente, O(1))
const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
const found = users.find((u) => u.email?.toLowerCase() === data.email)

// Opção B (preferida): query direta no banco via service client
const { data: existingUser } = await admin
  .from('auth.users')   // ou via RPC
  .select('id')
  .eq('email', data.email)
  .maybeSingle()
```

---

## BUG-004 — P0: URL de callback do magic link aponta para rota inexistente

**Arquivos e linhas:**
- `src/server/lojas/create.ts` linha 66 (invite de loja)
- `src/app/recuperar/recuperar-client.tsx` linha 25 (recuperação de senha)

**Código problemático:**
```typescript
// create.ts:66 — invite de nova loja
redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/admin/definir-senha`

// recuperar-client.tsx:25 — recuperação de senha
redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`
```

**Problema:** O route handler que troca o `code` Supabase por sessão está em:
```
src/app/api/auth/callback/route.ts  →  GET /api/auth/callback
```

Os e-mails enviados por Supabase apontam para `/auth/callback`, que não existe (404). O usuário clica no link do e-mail e recebe página de erro, impossibilitando:
- Convites de novos lojistas (fluxo principal de onboarding)
- Recuperação de senha por qualquer usuário

**Correção:**
```typescript
// Em ambos os arquivos, substituir /auth/callback por /api/auth/callback:
redirectTo: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback?next=/admin/definir-senha`
redirectTo: `${window.location.origin}/api/auth/callback?next=/redefinir-senha`
```

> **Nota:** O callback handler (`/api/auth/callback/route.ts`) tem whitelist de `next` correta e proteção contra open redirect. O problema é apenas a URL apontando para o lugar errado.

---

## BUG-005 — P1: Toggles de loja e kill switch sem tratamento de erro ou rollback

**Arquivo:** `src/app/(admin)/admin/super/super-client.tsx`  
**Linhas:** 32–48

**Código problemático:**
```typescript
async function toggleLoja(id: string, ativa: boolean) {
  setLojas((prev) => prev.map((l) => (l.id === id ? { ...l, ativa } : l))) // otimista
  await fetch(`/api/super-admin/lojas/${id}`, {          // sem await do response.ok
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ativa }),
  })
  // nenhum tratamento de erro, nenhum rollback
}

async function toggleKillSwitch(v: boolean) {
  setKillEnabled(v)                                     // otimista
  await fetch('/api/super-admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ try_on_enabled: v }),
  })
  // idem
}
```

**Impacto:**
- Se o servidor retornar 4xx/5xx ou ocorrer erro de rede, o toggle visual fica "ligado" enquanto o banco permanece no estado anterior.
- Para o kill switch, isso é grave: o admin pode acreditar que desativou o provador IA para todas as lojas, mas o banco ainda mostra `true`.
- Sem toast de erro, o usuário não percebe a falha.

**Correção:**
```typescript
async function toggleLoja(id: string, ativa: boolean) {
  const prev = lojas
  setLojas((l) => l.map((x) => (x.id === id ? { ...x, ativa } : x)))
  const r = await fetch(`/api/super-admin/lojas/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ativa }),
  })
  if (!r.ok) {
    setLojas(prev) // rollback
    toast.error('Falha ao atualizar loja')
  }
}
```

---

## BUG-006 — P2: Badge "Francisco" hardcoded no header do super admin

**Arquivo:** `src/app/(admin)/admin/super/page.tsx`  
**Linha:** 30

**Código problemático:**
```tsx
<Badge label="Francisco" variant="admin" />
```

**Impacto:** Em qualquer ambiente com múltiplos super-admins, ou se o nome do usuário mudar, o badge sempre exibirá "Francisco". A sessão do usuário já está disponível via `requireSuperAdmin()` (linha 12, retorna `session`), que contém `session.profile.nome_completo`.

**Correção:**
```tsx
const session = await requireSuperAdmin()
// ...
<Badge label={session.profile.nome_completo ?? session.user.email} variant="admin" />
```

---

## BUG-007 — P2: Potencial open redirect no parâmetro ?next= do login

**Arquivo:** `src/app/login/page.tsx`  
**Linhas:** 13 e 30

**Código problemático:**
```typescript
const next = params.get('next') ?? '/admin'  // linha 13 — sem validação
// ...
router.replace(next)                          // linha 30 — usado diretamente
```

**Impacto:** Um atacante pode construir `https://app.com/login?next=https://evil.com` e enviar para usuários. Após login legítimo, o `router.replace('https://evil.com')` pode redirecionar para site malicioso (phishing). O `next/navigation` router bloqueia alguns casos, mas não é garantido para URLs absolutas com domínio externo.

O callback handler (`/api/auth/callback`) tem proteção `safeNext()` correta (linhas 19–27), mas o login direto por senha não usa essa proteção.

**Correção:**
```typescript
// Reutilizar a lógica safeNext (extrair para @/lib/auth/safe-next.ts):
const ALLOWED_PREFIXES = ['/admin', '/redefinir-senha']
function safeNext(input: string | null): string {
  if (!input || !input.startsWith('/') || input.startsWith('//')) return '/admin'
  if (!ALLOWED_PREFIXES.some((p) => input === p || input.startsWith(`${p}/`))) return '/admin'
  return input
}
const next = safeNext(params.get('next'))
```

---

## BUG-008 — P2: Badge variant 'vendida' usada para o estado OFF do kill switch

**Arquivo:** `src/app/(admin)/admin/super/super-client.tsx`  
**Linha:** 135

**Código problemático:**
```tsx
<Badge label={killEnabled ? 'ON' : 'OFF'} variant={killEnabled ? 'disponivel' : 'vendida'} />
```

**Impacto:** A variant `'vendida'` tem significado de "peça vendida" (item fora de estoque). Usar para o estado "kill switch desligado" gera inconsistência semântica no sistema de design. Um futuro desenvolvedor que ler o código ou o Storybook pode se confundir sobre o propósito da variant.

**Correção:** Criar variant `'inativo'` ou `'danger'` no componente Badge, ou usar `'vendida'` apenas para peças.

---

## BUG-009 — P3: Chamada RPC morta em listLojasWithStats

**Arquivo:** `src/server/lojas/list.ts`  
**Linhas:** 29 e 43

**Código problemático:**
```typescript
const [pecasRes, tryOnRes] = await Promise.all([
  supabase.from('pecas').select('loja_id, status').in('loja_id', ids),
  supabase.rpc('try_on_uso_mes_atual', { p_loja_id: ids[0]! }), // apenas 1ª loja, ignorado
])
// ...
void tryOnRes  // suprime warning — resultado descartado
```

**Impacto:** Em cada carregamento do super admin, uma chamada RPC desnecessária é feita ao banco (para apenas a 1ª loja, com resultado imediatamente descartado). Isso aumenta latência e custo sem nenhum benefício. O código real já usa query direta na tabela `try_on_uses` (linhas 36–41) para obter os dados corretos.

**Correção:** Remover linhas 29 e 43. Simplificar o `Promise.all`:
```typescript
const [pecasRes] = await Promise.all([
  supabase.from('pecas').select('loja_id, status').in('loja_id', ids),
])
```

---

## BUG-010 — P3: Função de mutação `setLojaAtiva` em arquivo de listagem

**Arquivo:** `src/server/lojas/list.ts`  
**Linhas:** 66–69

**Código problemático:**
```typescript
// list.ts contém tanto leitura quanto escrita:
export async function setLojaAtiva(lojaId: string, ativa: boolean): Promise<void> { ... }
```

**Impacto:** Viola o princípio de separação de responsabilidades (SRP). O arquivo `list.ts` deve conter apenas queries de leitura. A função de mutação deveria estar em `update.ts` (que já existe no projeto) ou em arquivo específico.

**Correção:** Mover `setLojaAtiva` para `src/server/lojas/update.ts` e atualizar o import em `src/app/api/super-admin/lojas/[id]/route.ts`.

---

## Resumo Executivo

| ID | P | Descrição | Arquivo |
|----|---|-----------|---------|
| BUG-001 | **P0** | Botão "Salvar" budget sem onClick | super-client.tsx:149 |
| BUG-002 | **P0** | API settings ignora try_on_monthly_budget_usd | settings/route.ts:26-29 |
| BUG-003 | **P0** | Email lookup truncado (perPage:1) cria loja duplicada | create.ts:39-41 |
| BUG-004 | **P0** | Magic link aponta para /auth/callback (não existe) | create.ts:66, recuperar-client.tsx:25 |
| BUG-005 | **P1** | Toggles sem error handling nem rollback de estado | super-client.tsx:32-48 |
| BUG-006 | **P2** | Badge "Francisco" hardcoded no header | super/page.tsx:30 |
| BUG-007 | **P2** | Open redirect em ?next= do login | login/page.tsx:13,30 |
| BUG-008 | **P2** | Variant 'vendida' usada para kill switch OFF | super-client.tsx:135 |
| BUG-009 | **P3** | RPC call morta e descartada em listLojasWithStats | list.ts:29,43 |
| BUG-010 | **P3** | setLojaAtiva em arquivo de listagem (SRP) | list.ts:66 |

**Total: 4 críticos · 1 alto · 3 médios · 2 baixos**

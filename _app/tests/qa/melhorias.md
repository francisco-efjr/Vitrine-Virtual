# Sugestões de Melhoria — Vitrine Virtual

> **Perspectiva:** QA + Mercado de Moda Feminina  
> **Data:** 27/04/2026  

---

## Categoria 1: Segurança e Confiabilidade

### M-SEC-001: Centralizar lógica safeNext()

**Impacto:** Médio | **Esforço:** Baixo

A proteção contra open redirect em `/auth/callback` (linha 19-27) e a ausência dela no login (linha 13-30) cria inconsistência. Extrair para `src/lib/auth/safe-next.ts` e reutilizar nos dois pontos:

```typescript
// src/lib/auth/safe-next.ts
const ALLOWED_PREFIXES = ['/admin', '/redefinir-senha']
export function safeNext(input: string | null, fallback = '/admin'): string {
  if (!input || !input.startsWith('/') || input.startsWith('//')) return fallback
  if (!ALLOWED_PREFIXES.some((p) => input === p || input.startsWith(`${p}/`))) return fallback
  return input
}
```

### M-SEC-002: Rate limiting no login por senha

**Impacto:** Alto | **Esforço:** Médio

O login por senha (Supabase `signInWithPassword`) não tem rate limiting explícito na camada da aplicação — depende do limite do Supabase (que é generoso). Para mercado de moda, onde contas têm acesso a inventário e dados de clientes, implementar limit de 5 tentativas / 15 minutos por IP usando o Upstash Redis (já configurado para o try-on) é altamente recomendado.

### M-SEC-003: Auditoria de ações do super admin

**Impacto:** Alto | **Esforço:** Médio-Alto

Nenhuma ação do super admin é auditada. Para compliance e debugging em produção, criar tabela `admin_audit_log`:

```sql
CREATE TABLE admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,  -- 'loja_created', 'loja_toggled', 'kill_switch_changed', 'budget_changed'
  target_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz DEFAULT now()
);
```

O kill switch já loga via `logger.info()`, mas o log só vai para stdout/stderr e não persiste.

---

## Categoria 2: UX do Painel Admin

### M-UX-001: Feedback visual ao salvar configurações

**Impacto:** Alto | **Esforço:** Baixo

Os toggles de loja e kill switch não mostram feedback de sucesso ou erro. O padrão da indústria (Shopify, WooCommerce, Nuvemshop) é mostrar toast notification. Implementar um sistema simples de toasts:

```tsx
// Após toggleLoja bem-sucedido:
toast.success(`${loja.nome} ${ativa ? 'ativada' : 'desativada'}`)

// Em caso de erro:
toast.error('Falha ao atualizar. Tente novamente.')
```

### M-UX-002: Confirmação antes de ativar kill switch

**Impacto:** Alto | **Esforço:** Baixo

O kill switch afeta **todas** as lojas simultaneamente. Uma clique acidental desativa o provador IA para toda a plataforma. Adicionar dialog de confirmação:

```
"Você está prestes a DESATIVAR o Provador IA para todas as 3 lojas ativas.
Clientes não conseguirão usar o try-on até você reativar.
Confirmar?"
```

### M-UX-003: Paginação na lista de lojas

**Impacto:** Médio | **Esforço:** Médio

Com escala, uma plataforma de marketplace de moda pode ter dezenas ou centenas de lojas. Implementar paginação ou virtualização na listagem do super admin. O `listLojasWithStats()` atual faz `.select('*')` sem limite.

### M-UX-004: Busca e filtros na lista de lojas

**Impacto:** Médio | **Esforço:** Médio

Adicionar filtro por:
- Status (ativa/inativa)
- Range de peças
- Quota de try-ons (abaixo/acima de X%)

Referência de mercado: Shopify Partners dashboard, Nuvemshop admin.

### M-UX-005: Nome completo da lojista no painel super admin

**Impacto:** Médio | **Esforço:** Baixo

Atualmente a lista de lojas mostra slug e data de criação, mas não o nome/e-mail da lojista responsável. Adicionar e-mail do owner como informação secundária facilita suporte. O dado já está disponível via `auth.users.email` e pode ser incluído no `listLojasWithStats()`.

### M-UX-006: Preview da vitrine a partir do super admin

**Impacto:** Alto | **Esforço:** Baixo

Adicionar link clicável no slug `/v/{slug}` de cada loja para abrir a vitrine pública em nova aba. Facilita revisão de qualidade do conteúdo pelo super admin.

```tsx
<a href={`/v/${loja.slug}`} target="_blank" rel="noopener">
  /v/{loja.slug} ↗
</a>
```

---

## Categoria 3: Experiência da Lojista

### M-LOJA-001: Indicador de peças publicadas vs. rascunho

**Impacto:** Alto | **Esforço:** Médio

O modelo `pecas` tem campo `status` (enum), mas o dashboard do lojista não diferencia visualmente peças "disponíveis", "vendidas" e possíveis rascunhos. Lojas de moda frequentemente precisam gerenciar catálogo parcialmente publicado.

### M-LOJA-002: Upload de logo da loja

**Impacto:** Médio | **Esforço:** Médio

O campo `logo_storage_path` existe no banco mas não há interface para upload na tela de configurações. A tela de configurações (`config-client.tsx`) exibe apenas Nome, WhatsApp, Instagram, TikTok e toggle de preço. A logo é elemento fundamental de branding para lojas de moda.

### M-LOJA-003: Notificação de venda por WhatsApp/e-mail

**Impacto:** Alto | **Esforço:** Médio-Alto

Quando uma peça é marcada como vendida, não há notificação automática. Lojistas de moda frequentemente trabalham com estoque pequeno e precisão em tempo real. Implementar webhook/trigger no Supabase para notificar via WhatsApp Business API quando `pecas.status = 'vendida'`.

### M-LOJA-004: Dashboard com métricas de visualização

**Impacto:** Alto | **Esforço:** Alto

O painel lojista tem básico de peças e vendas. Adicionar:
- Visualizações da vitrine por peça (usando `try_on_uses` como proxy de interesse)
- Taxa de conversão (cliques no WhatsApp / visualizações)
- Horários de pico de visita

Referência: Instagram Shopping analytics, Nuvemshop dashboard.

### M-LOJA-005: Exportação de catálogo em múltiplos formatos

**Impacto:** Médio | **Esforço:** Médio

A exportação CSV (`/api/pecas/export`) já existe. Adicionar:
- PDF com fotos (para catálogo impresso — comum em feiras de moda)
- Excel/XLSX com fórmulas de precificação
- JSON para integração com outros sistemas

---

## Categoria 4: Vitrine Pública

### M-VIT-001: SEO por peça individual

**Impacto:** Alto | **Esforço:** Médio

Cada peça tem sua própria página `/v/[slug]/peca/[pecaId]`. Adicionar:
- `<title>` dinâmico: `{nome da peça} — {nome da loja}`
- `og:image` com a foto principal da peça
- Dados estruturados `Product` do Schema.org

Fundamental para tráfego orgânico — o canal principal de aquisição para lojas de moda pequenas é Instagram → Google.

### M-VIT-002: Compartilhamento nativo por peça

**Impacto:** Médio | **Esforço:** Baixo

Botão de compartilhamento usando a Web Share API:

```tsx
navigator.share({
  title: peca.nome,
  text: `Olha essa peça incrível na ${loja.nome}`,
  url: window.location.href
})
```

Fallback para copiar link. Mercado de moda tem alta viralização por compartilhamento direto.

### M-VIT-003: Lista de espera quando peça está vendida

**Impacto:** Médio | **Esforço:** Médio

Quando uma peça é marcada como vendida, mostrar formulário "Me avise se disponível" (e-mail/WhatsApp). Prática padrão em e-commerce de moda com estoque unitário (cada peça é única em brechós e ateliês).

### M-VIT-004: Try-on com feedback do usuário

**Impacto:** Alto | **Esforço:** Médio

Após o resultado do provador virtual (FASHN.ai/Gemini/Replicate), adicionar:
- Botão "Gostei / Não gostei" para qualidade do resultado
- Opção de salvar resultado
- CTA direto para WhatsApp com a imagem gerada

O loop de feedback melhora a qualidade percebida e aumenta conversão.

---

## Categoria 5: Infraestrutura e Operações

### M-OPS-001: Implementar cron de kill switch por orçamento

**Impacto:** Alto | **Esforço:** Médio

`kill-switch.ts` menciona "Cron diário (a ser implementado)" mas não existe. Implementar no Vercel Cron:

```typescript
// api/cron/check-budget/route.ts
// Executa diariamente à meia-noite
// Soma custo estimado de try-ons do mês
// Se > budget, chama setTryOnEnabled(false)
```

Sem isso, o orçamento é apenas cosmético — não protege contra gastos excessivos.

### M-OPS-002: Alertas de quota por loja

**Impacto:** Médio | **Esforço:** Médio

Quando uma loja atingir 80% da cota mensal, enviar alerta para o super admin. A barra de progresso visual já existe no painel, mas sem notificação proativa.

### M-OPS-003: Health check endpoint

**Impacto:** Médio | **Esforço:** Baixo

Criar `GET /api/health` que verifica:
- Conexão com Supabase
- Estado do kill switch
- Latência média de resposta

Para monitoramento com UptimeRobot, Better Uptime ou similar.

### M-OPS-004: Testes E2E automatizados no CI/CD

**Impacto:** Alto | **Esforço:** Alto

Playwright está configurado no projeto mas os testes E2E não estão sendo executados. Integrar no GitHub Actions:

```yaml
# .github/workflows/e2e.yml
- name: Run E2E tests
  run: npx playwright test tests/qa/
  env:
    TEST_SUPER_ADMIN_EMAIL: ${{ secrets.TEST_SUPER_ADMIN_EMAIL }}
    TEST_SUPER_ADMIN_PASSWORD: ${{ secrets.TEST_SUPER_ADMIN_PASSWORD }}
```

---

## Priorização (MoSCoW para próxima sprint)

### Must Have (P0 — blockers de produção)
- Corrigir BUG-004: URL de callback do magic link
- Corrigir BUG-003: email lookup truncado
- Corrigir BUG-001 + BUG-002: salvar orçamento

### Should Have (qualidade de produto)
- M-UX-002: Confirmação antes de matar kill switch
- M-UX-001: Toasts de feedback
- M-OPS-001: Cron de kill switch por orçamento
- M-SEC-003: Audit log de ações admin

### Could Have (crescimento)
- M-LOJA-002: Upload de logo
- M-VIT-001: SEO por peça
- M-UX-005: E-mail do owner na lista de lojas
- M-UX-006: Preview da vitrine a partir do super admin

### Won't Have (próxima versão)
- M-LOJA-004: Dashboard analítico completo
- M-VIT-004: Try-on com feedback do usuário
- M-OPS-004: E2E no CI/CD completo

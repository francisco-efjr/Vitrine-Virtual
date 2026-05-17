# Sessão 2026-05-17 — Handoff Admin/Super-Admin implementado

> Implementação do handoff de design `Vitrine Virtual.html` (briefing do chat6).
> Autonomia total concedida pelo Francisco para finalizar (commit + aplicar no Supabase).

## O que foi entregue

1. **Tracking de intenção de contato** — tabela `contact_clicks`, rota
   `POST /api/track/contact` (sendBeacon antes do redirect, não bloqueia),
   `ContactLinks` na vitrine pública, analytics no Super-Admin.
2. **Modelo de imagem por loja** — `lojas.ai_image_model` (High/Medium →
   `GOOGLE_AI_MODEL` / `GOOGLE_AI_FALLBACK_MODEL`). Default = `medium`
   (igual ao mock do design e ao GA atual — sem mudança de comportamento).
3. **Fix do bug do slug** + redesign da tela "Nova loja".
4. **Links de preview no Admin** (Ver vitrine / Ver experiência do cliente).
5. **Base de aprendizado de qualidade** — `try_on_generations` + feedback
   opcional minimalista na Cabine (sem termos de "IA").

## Decisões registradas

- [[decisions/0009-armazenamento-foto-e-aprendizado-qualidade|ADR 0009]]
  substitui [[decisions/0006-privacidade-foto-cliente-final|0006]]: o PO
  optou, de forma informada, por **armazenar a foto do cliente** em bucket
  privado para a base de qualidade. ADR 0006 mantida como histórico.

## Banco (projeto tfylrbxajzmhsdnynpbx)

- Migration `contato_modelo_qualidade` aplicada (remoto: `20260517200526`).
- 4 lojas existentes → todas `ai_image_model = 'medium'` (default aplicado,
  não-breaking). `default_ai_image_model = "medium"` em system_settings.
- **Gap pré-existente corrigido:** o enum `try_on_provider` no remoto não
  tinha `'google'` (migration local 0006_google_ai nunca aplicada no
  remoto). Sem isso, gerações do provider primário falhavam ao logar.
  Corrigido via `add value if not exists 'google'` (idempotente). Espelhado
  na migration local `20260517000011_add_google_try_on_provider.sql`.
- Advisor de segurança: nenhum alerta novo nas tabelas criadas (RLS ok).
  Warnings restantes são pré-existentes (funções SECURITY DEFINER públicas
  da vitrine — intencionais — e config de Auth) — fora de escopo.

## Pendências (LGPD — antes do go-live, ver ADR 0009)

- [ ] Atualizar `/privacidade`: retenção da foto, finalidade, base legal.
- [ ] Política de expurgo automático do bucket `try-on-customer-photos`.
- [ ] Reavaliar opt-in explícito na DPIA.

## Verificação

- `tsc` ok · 258 testes passando.
- `pnpm lint`/`qa` não roda neste worktree (incompat. pré-existente
  `eslint-plugin-tailwindcss` + pnpm aborta em arquivo não tocado);
  código validado contra as regras core do ESLint sem violações.

---
**Tags:** #projeto/vitrine-virtual #discovery #ia #lgpd #handoff

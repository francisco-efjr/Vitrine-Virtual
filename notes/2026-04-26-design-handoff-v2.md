# Design handoff v2 — 26/04/2026

> Segundo handoff do Claude Designer. URL: `m-E383bT7-o4AMtQ38oCgA`.

## O que mudou em relação ao v1

JSXs e tokens **idênticos** ao handoff anterior. O designer evoluiu o protótipo `Vitrine Virtual.html` adicionando duas seções novas inline.

| Arquivo | Antes | Depois | Diff |
|---|---|---|---|
| `chats/chat1.md` | 161 linhas | 303 linhas | +142 |
| `Vitrine Virtual.html` | 911 linhas | 1257 linhas | +346 |
| Demais (5 JSX) | iguais | iguais | 0 |

## Telas novas

### 1. Recuperar senha (`RecuperarSenha`)
- Formulário com campo de e-mail + botão "Enviar link de recuperação"
- Estado de sucesso **genérico** ("Se existe uma conta com X…") — não revela se conta existe (boa prática anti-enumeration)
- Link "Voltar ao login"

### 2. Definir senha pós-convite (`DefinirSenha mode="invite"`)
- Banner: "Você foi convidada para Atelier Laila"
- Campos: nova senha + confirmar senha + toggle ver/ocultar
- Checklist de força em tempo real:
  - Mínimo 8 caracteres
  - Letra maiúscula
  - Número
  - Senhas coincidem
- Estado "Tudo pronto!" pós-save com CTA "Acessar minha vitrine"

### 3. Redefinir senha (`DefinirSenha mode="reset"`)
- Mesma tela do anterior, sem o banner de convite
- CTA final: "Ir para o login"

### 4. Detalhe completo da peça (`PecaDetalhe` — modal no painel admin)
- Modal 820px, abre quando clica em qualquer card de peça
- Esquerda: foto principal grande + thumbnails + botão "+"
- Direita: tabs **Informações** / **Descrição**
- Footer: Editar / Marcar como vendida / Excluir
- Link público copiável

## ⚠️ Problema com PecaDetalhe — campos fora do MVP

O designer assumiu que a peça tem os seguintes campos, que **NÃO estão no schema** porque foram explicitamente excluídos do MVP no brief original (seção 22):

| Campo | Status no schema | No design |
|---|---|---|
| Categoria | ❌ Não existe | Mostrado |
| Cor | ❌ Não existe | Mostrado |
| Marca | ❌ Não existe | Mostrado |
| Estado/conservação | ❌ Não existe | Mostrado |
| Descrição | ❌ Não existe | Tab editável |
| Status "reservado" | ❌ Só temos disponível/vendida | Mencionado no chat |

Brief original (seção 22, restrições): *"Não faça: descrição, categoria e cor da peça neste primeiro MVP."*

**Decisão a tomar com o cliente:** implementar PecaDetalhe sem os campos extras (alinhado ao MVP), ou expandir o schema agora.

## Plano para esta sessão

Três frentes paralelas conforme [[../decisions/0007-workflow-git-cliente-mac|ADR 0007]] (uma branch cada):

1. **`feat/auth-screens`** — recuperar senha + definir senha pós-convite + redefinir senha (independe da decisão sobre campos extras)
2. **`feat/peca-detalhe`** — modal de detalhe (depende da decisão sobre campos extras)
3. **`chore/deploy-vercel`** — config de produção (independente)
4. **`chore/security-hardening`** — review end-to-end (independente)

Responsividade entra como cross-cutting: cada PR garante mobile (375px) por default.

## Próximo passo

Perguntar ao cliente sobre os campos extras antes de começar a `feat/peca-detalhe`. Demais branches já podem começar.

---
**Tags:** #projeto/vitrine-virtual #design #handoff #2026-04-26

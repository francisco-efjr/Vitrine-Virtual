# Design handoff recebido — 25/04/2026

> Handoff completo do designer (via Claude Designer) recebido e arquivado em [[design-handoff/README|notes/design-handoff/]]. Inclui 5 telas em JSX, tokens, components e a transcrição da conversa.

## Direção visual declarada

> **Cormorant Garamond** (títulos elegantes) + **DM Sans** (corpo limpo)
> Fundo off-white quente `#faf7f3` · Acento ouro-taupe `#b8956a`
> Tipografia em carvão quente. **Atemporal, aconchegante, feminino sem ser infantil.**
> Público: mulheres 20–50 anos, moda casual.

## Tokens extraídos (de `SharedComponents.jsx`)

### Cores
```ts
const C = {
  bg: '#faf7f3', surface: '#ffffff', surface2: '#f5f0ea', surface3: '#ede6dc',
  text: '#1e1a17', text2: '#6d6460', text3: '#b0a59d',
  accent: '#b8956a', accentDark: '#8b6840', accentLight: '#f2e8d8',
  border: '#e6dfd6', border2: '#d4cbc0',
  success: '#6b9b78', successLight: '#e8f3eb',
  danger: '#c47a7a', dangerLight: '#f7ebeb',
  warning: '#c49a5a', warningLight: '#faf0e0',
}
```

### Tipografia
- **Serif:** `'Cormorant Garamond', Georgia, serif` — títulos, valores monetários
- **Sans:** `'DM Sans', system-ui, sans-serif` — corpo, UI, labels
- Sizes: 11, 12, 13, 14, 15, 16, 18, 20, 22, 26, 28, 32 (escala usada)
- Letter-spacing em uppercase: `0.06em`

### Espaçamento (radius)
- Buttons: 8 · Cards: 12–14 · Modal: 16–20 · Avatar/Toggle: pill

## Telas entregues (5 protótipos)

| Tela | Arquivo | O que cobre |
|---|---|---|
| **Vitrine Pública** | `PublicVitrine.jsx` | Mobile (PhoneFrame) + Desktop side-by-side; cards de peças com hover "Provar"; toggle preço; CTA WhatsApp; header com Instagram/TikTok/WhatsApp |
| **Painel da Loja** | `AdminPanel.jsx` | Sidebar com 4 seções (Dashboard, Peças disponíveis, Todas, Configurações); KPIs + barra de cota; modal de cadastro/edição de peça; busca + view grid/list; modal de exclusão |
| **Provador Virtual** | `TryOnModal.jsx` | Fluxo de 4 etapas (Escolher → Confirmar → Loading → Resultado); consentimento LGPD obrigatório; CTA WhatsApp pré-preenchido com nome da peça |
| **Super-Admin** | `SuperAdmin.jsx` | Header com badge "Francisco"; KPIs globais; lista de lojas com cota individual; modal "Nova loja + convite" (gera slug a partir do nome); kill switch global + orçamento mensal |
| **Componentes base** | `SharedComponents.jsx` | Btn, Badge, Input, Select, Modal, Card, KpiCard, Divider, Spinner, ImgPlaceholder, Toggle, Avatar, VVLogo |

## Logo provisório

`VVLogo` (em `SharedComponents.jsx`): retângulo arredondado com "vv" + palavra "vitrine" em serif. Provisório, conforme combinado.

## Confirmações que o design valida das nossas decisões

- ✅ **Sidebar com 4 itens:** Dashboard, Peças disponíveis, Todas as peças, Configurações (alinhado ao brief seção 7).
- ✅ **5 KPIs no dashboard** (alinhado seção 8).
- ✅ **Cards/grid com ações** (Editar, Vendida, Excluir) e modal de confirmação para excluir (seção 10).
- ✅ **Vitrine pública mobile-first** com toggle de preço default-off (seções 12 e 13).
- ✅ **Botão WhatsApp pré-preenchido** com nome da peça — responde a [[../README|dúvida C]] do README do projeto.
- ✅ **Provador IA com consentimento explícito** ("Concordo... ela não será armazenada"), reforçando o [[../decisions/0006-privacidade-foto-cliente-final|ADR 0006]].
- ✅ **Super-admin com painel próprio**, alinhado ao [[../decisions/0003-onboarding-manual-super-admin|ADR 0003]].
- ✅ **Kill switch global visível para Francisco**, alinhado ao [[../decisions/0004-anti-abuso-quatro-camadas|ADR 0004]] (camada 4).

## Pequenos ajustes que o design propõe (e que vou seguir)

- **Texto da CTA WhatsApp na vitrine pública:** *"Olá! Vi a peça '[Nome]' na vitrine e adorei! Gostaria de mais informações."* → resolve [[../README|dúvida C]].
- **Estimativa de custo de IA exibida no super-admin** (ex: "≈ US$ 8.82 estimado") usando US$ 0,06/try-on como média do FASHN.
- **Visualização grid/list switch** na lista de peças (não tinha no brief, vou implementar — UX melhor para lojas com muitas peças).
- **Busca por nome na lista de peças** (não tinha no brief, vou implementar — UX necessária assim que passar de 20 peças).
- **Slug da vitrine auto-gerado a partir do nome** no modal de criação de loja (super-admin), com normalização de acentos.

## O que ainda não tem design e fica para próxima rodada

- Tela de login da lojista
- Tela de definir senha (vinda do magic link de convite)
- Tela de recuperação de senha
- Tela de detalhe de peça (`/v/[slug]/peca/[id]` — design tem só a vitrine, não a página individual)
- Página `/privacidade` (texto)
- Página `/termos` (texto)
- E-mail de convite (template HTML)
- Empty states (loja sem peças, busca sem resultados)
- Estados de erro (falha no try-on, cota esgotada — só foi mencionado, não desenhado)

Esses ficam como solicitação para a próxima sessão de design. **Não bloqueiam Sprint 0–3 e a maior parte da Sprint 4–5** porque consigo usar o design existente e propor variações pequenas onde necessário.

## Plano de implementação alinhado ao design

A camada de UI vai usar **shadcn/ui + Tailwind** com os tokens acima injetados em `tailwind.config.ts` como `theme.extend.colors`. Os componentes JSX do designer servem como **referência visual e de comportamento** (não copio a estrutura React deles literalmente — recriar usando Server Components + Client Components onde fizer sentido, aproveitando o RSC do Next.js App Router).

A regra "atemporal" se manifesta no código como: **zero animações chamativas, transições curtas (180–220ms), sombras suaves, sem gradientes neon, sem ícones emoji em produção** (designer usou emoji como placeholder; vou trocar por `lucide-react`).

---
**Tags:** #projeto/vitrine-virtual #design #handoff #2026-04-25

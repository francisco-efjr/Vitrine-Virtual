# Regras de trabalho — Vitrine Virtual

> Combinado entre Francisco e Claude em 25/04/2026.
> Esta nota é a fonte de verdade sobre **como** o trabalho é feito neste projeto.

## Regra de ouro: tudo vive no vault

**Qualquer pensamento, decisão, dúvida, hipótese, descoberta ou progresso relevante neste projeto é salvo em algum arquivo deste vault Obsidian, antes de eu seguir adiante.**

Não basta responder no chat. Se a informação importa, ela mora em um arquivo `.md` aqui dentro. O chat é efêmero; o vault é o cérebro permanente.

## O que vai onde

| Tipo de informação | Local |
|---|---|
| Decisão arquitetural com alternativas + consequências | `decisions/NNNN-titulo-curto.md` (ADR numerado) |
| Próximos passos, em andamento, backlog | [[todo]] (atualizado a cada sessão) |
| Discovery, reuniões, sessões de trabalho | `notes/YYYY-MM-DD-titulo.md` |
| Documento entregável (proposta, spec, RFC) | `notes/nome-do-doc.md` |
| Visão geral, status, marcos do projeto | [[README]] |
| Como trabalhamos | esta nota ([[REGRAS]]) |
| Conceitos genéricos descobertos no projeto que sirvam para outros projetos | `../../05-Zettel/...` (subir para Zettelkasten) |

## Convenções de ADR

- Numerados com 4 dígitos: `0001`, `0002`, ...
- Slug curto e descritivo: `0007-cache-de-imagens-cloudflare.md`
- Status: **Aceita** | **Proposta** | **Substituída por NNNN** | **Rejeitada**
- Toda ADR tem: Contexto · Decisão · Alternativas consideradas · Consequências (✅ / ⚠️ / 🔄) · Referências
- Se uma decisão antiga for revisada, **não apago** a ADR original — crio uma nova e marco a antiga como "Substituída por NNNN".

## Cadência de atualização

| Quando | O que atualizo |
|---|---|
| Início de sessão | Leio [[README]] + [[todo]] para reorientar |
| Toda decisão arquitetural relevante | Crio ADR antes de implementar |
| Fim de cada feature/sprint | Atualizo [[todo]] (concluídos → "Concluído (últimos 7 dias)"), atualizo marcos no [[README]] se aplicável |
| Toda sessão com Francisco | Crio nota em `notes/YYYY-MM-DD-titulo.md` resumindo decisões e perguntas pendentes |
| Toda dúvida nova | Adiciono na seção "Dúvidas pendentes" do [[README]] |

## Anti-padrões (o que NÃO fazer)

- ❌ Tomar decisão importante só no chat sem registrar como ADR.
- ❌ Implementar feature sem checar se há dúvida pendente sobre ela no [[README]].
- ❌ Apagar histórico (ADR antigo, decisão revisada) — sempre por sobreposição com referência.
- ❌ Misturar `notes/` com `decisions/` (notas são contexto vivo; decisões são imutáveis).
- ❌ Esquecer de atualizar o [[todo]] ao terminar algo.
- ❌ Usar nomes de arquivo com espaços ou caracteres especiais (atrapalha links Obsidian e CLI).

## Padrão de tags

Usadas em todos os arquivos deste projeto:

- `#projeto/vitrine-virtual` — pertence a este projeto
- `#projeto` — qualquer projeto (genérico, herdado do template)
- `#status/ativo` (no [[README]])
- `#adr` (em todos os arquivos de `decisions/`)
- `#todo` (no [[todo]])
- `#discovery` (em notas de discovery)
- Tags temáticas livres: `#seguranca`, `#lgpd`, `#ia`, `#auth`, `#multi-tenancy`, etc.

## Links sempre que possível

Links wiki `[[arquivo]]` em vez de listar caminhos. O grafo do Obsidian é a teia de conhecimento.

## Quando o projeto for arquivado

Mover toda a pasta `01-Projects/vitrine-virtual/` para `04-Archive/vitrine-virtual-YYYY-MM/` e atualizar tag `#status/arquivado`. ADRs continuam válidos como histórico técnico — não devem ser apagados.

---
**Tags:** #projeto/vitrine-virtual #meta #regras

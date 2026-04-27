# ADR 0008 — Peças no MVP: manter schema enxuto

> **Status:** Aceita
> **Data:** 2026-04-26
> **Decisores:** Francisco (cliente) + Claude

## Contexto

O segundo handoff do designer (v2) trouxe um modal de "Detalhe da peça" que mostra: **categoria, cor, marca, estado/conservação, descrição** e três níveis de status (disponível / reservado / vendida).

Esses campos não existem no schema porque foram **explicitamente excluídos no brief original** (seção 22, restrições):

> Não faça: descrição, categoria e cor da peça neste primeiro MVP.

## Decisão

**Manter MVP enxuto:** o modal `PecaDetalhe` será implementado **apenas com os campos que existem no schema** (nome, preço, tamanho, status disponível/vendida, fotos, link público).

Onde o design tem campos extras, vamos exibir um badge **"em breve"** (cinza claro) no lugar — para que o cliente reconheça o layout do designer mas saiba que a feature não está disponível.

## Alternativas consideradas

- **Expandir schema agora:** rejeitada. Aumentaria escopo do MVP em ~1 dia (migration + UI de cadastro com mais campos + validações + traduções) sem evidência de demanda real das primeiras lojas.
- **Adicionar só `descricao` como free-text:** considerada como meio-termo. Rejeitada porque tem custo (migration + validators + UI) e o cliente preferiu manter o foco em entregar as features-base já desenhadas.

## Consequências

- ✅ Mantém ritmo do MVP, fiel ao brief.
- ✅ PecaDetalhe ainda entrega valor (link público copiável, ações, foto principal, status).
- ⚠️ UI mostra placeholders "em breve" — pode parecer incompleta para usuário externo. Mitigação: estilo discreto, não chamativo.
- 🔄 Reversibilidade alta: adicionar os campos depois é uma migration + uma atualização do form. Sem rework no resto.

## Próximos passos

- Implementar `PecaDetalhe` na branch `feat/peca-detalhe` com placeholders "em breve" para os campos extras.
- Quando o cliente decidir adicionar algum desses campos no futuro, criar nova migration `2026XXXX_pecas_metadata.sql`.

## Referências

- [[../README|README do projeto]]
- [[../notes/2026-04-26-design-handoff-v2|Handoff v2]]
- Brief original do cliente, seção 22.

---
**Tags:** #adr #projeto/vitrine-virtual #mvp #escopo

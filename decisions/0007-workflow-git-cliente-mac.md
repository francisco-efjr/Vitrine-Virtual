# ADR 0007 — Workflow git: cliente no Mac, Claude no Windows

> **Status:** Aceita
> **Data:** 2026-04-26
> **Decisores:** Francisco (cliente, Mac) + Claude (Windows + sandbox Linux)

## Contexto

O ambiente em que Claude opera (Windows do Francisco + sandbox Linux) **não é o mesmo** ambiente em que Francisco programa/roda o app (Mac). Os dois precisam compartilhar o mesmo repositório sem pisar no pé um do outro.

GitHub remoto: `https://github.com/francisco-efjr/Vitrine-Virtual.git`

Restrição: Claude não tem credenciais GitHub do Francisco no sandbox (sem `gh auth`, sem PAT). Push direto do sandbox para o GitHub não funciona.

## Decisão

**Branch por feature/sessão de trabalho** — nada vai direto em `main`.

Para cada bloco de trabalho:

1. Claude cria branch local com nome significativo:
   - `feat/<o-que>` — nova funcionalidade
   - `fix/<o-que>` — correção
   - `chore/<o-que>` — manutenção, configs, docs
   - Exemplo: `feat/upload-fotos-pecas`, `fix/login-redirect`, `chore/atualizar-readme`
2. Claude trabalha, commita, e gera **dois entregáveis** em `outputs/`:
   - `vitrine-virtual-<branch>.bundle` — bundle git da branch (pode ser dado um `git fetch` ou `git pull`)
   - `vitrine-virtual-<branch>.patch` — diff opcional, mais legível
3. Francisco no Mac:
   - Faz `git fetch <bundle>` da branch e cria localmente
   - Revisa, testa
   - Pusha pro GitHub (`git push origin <branch>`)
   - Abre PR para `main`, revisa, merge
4. `main` no GitHub é a fonte de verdade. Claude faz `git pull --rebase` antes de começar nova branch.

## Alternativas consideradas

- **Cliente fornece Personal Access Token (PAT) para Claude pushar direto:** rejeitado por segurança — credencial fica no sandbox.
- **Tudo direto em `main` sem branch:** rejeitado — perde rastreabilidade e impossibilita revisão.
- **Forçar Francisco a copiar/colar arquivos um a um:** rejeitado — péssima UX.

## Consequências

- ✅ Histórico limpo no GitHub, com PRs revisáveis.
- ✅ Branch isolada por sessão facilita rollback.
- ✅ Francisco mantém controle total das credenciais.
- ⚠️ Há um passo manual de Francisco aplicar bundle e pushar. Latência maior que push direto.
- 🔄 Reversibilidade alta — se virar incômodo, podemos passar a usar PAT no sandbox depois.

## Convenções de commit

- Prefixo: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Mensagem em português, modo imperativo
- Corpo opcional explicando o "porquê"

---
**Tags:** #adr #projeto/vitrine-virtual #workflow #git

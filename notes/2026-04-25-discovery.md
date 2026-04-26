# Discovery inicial — 25/04/2026

> Sessão de abertura do projeto. Cliente entregou um brief detalhado de 24 seções e respondeu 8 perguntas de qualificação.

## Contexto da sessão

- Cliente trouxe um brief muito completo do produto Vitrine Virtual em 24 seções (visão, escopo MVP, multi-tenant, auth, banco, privacidade, painel admin, dashboard, peças, vitrine pública, link de peça, IA virtual try-on, fotos, deploy, docs, qualidade, critérios de aceite, restrições e estilo visual).
- Brief já cobria 80%+ das decisões. Restavam ambiguidades de stack, custo, postura anti-abuso e geografia.
- Antes de propor qualquer arquitetura, fiz **8 perguntas estruturadas** organizadas em 2 rodadas de 4 perguntas cada (ferramenta `AskUserQuestion`).

## Rodada 1 — perguntas e respostas

| # | Pergunta | Resposta do Francisco |
|---|---|---|
| 1 | Stack base (auth + banco + storage + frontend)? | **Supabase + Next.js + Vercel** |
| 2 | Como lidar com o provador virtual com IA no MVP? | **Integrar API paga já no MVP** |
| 3 | Como as lojas vão entrar no sistema? | **Manual: você cria a conta de cada loja e envia credenciais** |
| 4 | Público-alvo geográfico do MVP? | **Brasil somente — PT-BR, LGPD** |

## Rodada 2 — perguntas e respostas

| # | Pergunta | Resposta do Francisco |
|---|---|---|
| 5 | Como criar/gerenciar as lojas (já que o onboarding é manual)? | **Painel super-admin dentro do próprio app** |
| 6 | Orçamento máximo por geração do provador IA? | **Até US$ 0,15 por geração (~R$ 0,80)** |
| 7 | Camadas anti-abuso da IA paga? | **TODAS as 4: rate limit IP + cota mensal por loja + Turnstile + kill switch global** |
| 8 | Contas/recursos já prontos? | **Apenas GitHub** (precisa criar Supabase, Vercel, FASHN, Replicate, Upstash, Cloudflare, Sentry; decidir sobre domínio) |

## Insights relevantes desta sessão

- **Postura de segurança:** Francisco escolheu **todas** as 4 camadas anti-abuso quando podia escolher só uma ou duas. Isso indica perfil de cliente **avesso a risco financeiro** — bom alinhamento com a abordagem de defesa em profundidade.
- **Escolha de onboarding manual** sinaliza que a fase comercial será **alta-touch nas primeiras dezenas de lojas**, não auto-serviço. Isso simplifica o MVP (sem signup público, sem aprovação automatizada, sem billing) e adia complexidade para v2.
- **Teto de US$ 0,15/geração** confortável para FASHN.ai (US$ 0,04–0,08), com folga para fallback Replicate. Não cabe Kling AI nem Vertex AI no orçamento.
- **Cliente confiou na recomendação de stack** sem contraproposta — sinal de que valoriza minha capacidade técnica e quer execução rápida.

## O que ficou em aberto após esta sessão

Dúvidas que **não bloqueiam a estruturação**, mas precisam ser respondidas antes das sprints indicadas (registradas no [[../README]] e [[../todo]]):

| # | Pergunta | Quando preciso |
|---|---|---|
| A | Slugs das primeiras 1–3 lojas? | Sprint 1 |
| B | Logo/favicon do produto? | Sprint 4 |
| C | Texto pré-preenchido do botão WhatsApp? | Sprint 4 |
| D | Customizar e-mail de convite ou usar template padrão Supabase? | Sprint 1 |
| E | Comprar domínio agora ou começar em `*.vercel.app`? | Sprint 6 |
| F | Controlador da política de privacidade (e-mail/CNPJ)? | Sprint 6 |

## Resultado da sessão

- [[proposta-tecnica-v1|Proposta Técnica v1]] elaborada e entregue ao cliente para aprovação.
- 6 ADRs registrados ([[../decisions/0001-stack-supabase-nextjs-vercel|0001]] a [[../decisions/0006-privacidade-foto-cliente-final|0006]]).
- Solicitação do cliente: salvar tudo no vault Obsidian — atendida criando a estrutura do projeto seguindo o template do `Claude's Brain`.

---
**Tags:** #projeto/vitrine-virtual #discovery #2026-04-25

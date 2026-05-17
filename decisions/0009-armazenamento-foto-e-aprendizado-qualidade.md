# ADR 0009 — Armazenamento da foto do cliente e base de aprendizado de qualidade

> **Status:** Aceita · **substitui [[0006-privacidade-foto-cliente-final|ADR 0006]]**
> **Data:** 2026-05-17
> **Decisores:** Francisco (cliente/PO) + Claude

## Contexto

A [[0006-privacidade-foto-cliente-final|ADR 0006]] estabeleceu que a foto do cliente final **nunca** seria persistida (princípio de minimização LGPD), aceitando como trade-off a impossibilidade de auditar por que uma geração específica saiu ruim.

Com o produto evoluindo, o PO definiu como prioridade a **melhoria contínua da qualidade das imagens**: comparar modelos (High vs Medium), refinar prompts, identificar padrões de falha e medir satisfação do cliente. Isso exige uma base de dados de gerações — incluindo as entradas (foto do cliente, foto da peça), o prompt/parâmetros, o resultado e feedback opcional.

O PO foi informado explicitamente do conflito com a ADR 0006 e das implicações de LGPD, e **optou conscientemente por armazenar a foto do cliente** para viabilizar a base de aprendizado.

## Decisão

1. **Passamos a armazenar**, por geração, em `public.try_on_generations`:
   - `loja_id`, `peca_id`, `user_id` (quando houver), `session_id`, `ip_hash`
   - caminho da **foto do cliente** (bucket privado `try-on-customer-photos`)
   - caminho da **foto da peça** usada
   - `ai_image_model` (High/Medium) + `model_resolved` (nome técnico Gemini)
   - `final_prompt`, `generation_params` (jsonb), `provider`, `provider_request_id`
   - `result_bucket`/`result_path` (resultado já vivia em `try-on-results`)
   - `status` (success/error/fallback), `error_code`, `duration_ms`
   - feedback opcional do cliente: `feedback_positivo`, `feedback_comentario`, `feedback_at`

2. **Segurança do armazenamento:**
   - Bucket `try-on-customer-photos` é **privado** — acesso só via `service_role`.
   - RLS em `try_on_generations`: leitura apenas para super-admin ou dono da loja; escrita só via service role (rotas server-side).
   - `ip_hash` mantém o padrão SHA-256+salt (nunca IP cru).

3. **Resiliência:** todo o logging é *best-effort* (`try/catch`). Uma falha de gravação **nunca** quebra o fluxo do provador para o cliente.

4. **Consentimento e transparência:** o checkbox de consentimento e os textos da Cabine foram ajustados para **não afirmar mais** que a imagem não é armazenada. A página `/privacidade` precisa ser atualizada para refletir a nova retenção, finalidade (melhoria de qualidade) e base legal antes do go-live.

5. **Feedback minimalista e opcional:** "O resultado ficou bom?" Sim/Não + comentário opcional. Sem termos técnicos, sem "IA" na experiência pública.

## Alternativas consideradas

- **Manter ADR 0006 (não armazenar):** rejeitada pelo PO — inviabiliza a base de aprendizado e a comparação entre modelos, que é a prioridade atual de produto.
- **Armazenar só hash/embedding irreversível:** rejeitada — insuficiente para análise visual de qualidade de prompt/modelo.
- **Armazenar só mediante opt-in explícito do cliente:** considerada; o PO optou por armazenar sempre. Recomenda-se reavaliar opt-in + política de retenção/expurgo na DPIA antes do go-live.

## Consequências

- ✅ **Positivas:**
  - Base sólida para comparar High vs Medium, refinar prompts e medir satisfação.
  - Auditoria real de gerações ruins (prompt + parâmetros + entradas + resultado).
  - Não impacta o fluxo atual (logging best-effort, modelo default = `medium` = comportamento atual).

- ⚠️ **Negativas / trade-offs:**
  - **Aumenta a superfície de risco LGPD** — passamos a guardar dado pessoal (foto). Exige: atualização da política de privacidade, base legal (consentimento), política de retenção/expurgo, e tratamento em pedidos de exclusão.
  - Custo de storage maior.
  - Dependência de bucket privado bem configurado — vazamento teria impacto reputacional/legal.

- 🔄 **Reversibilidade:** Média. Voltar a não armazenar é tecnicamente simples (parar de gravar + expurgar bucket), mas dados já coletados precisariam ser eliminados e os titulares notificados conforme o caso.

## Pendências antes do go-live

- [ ] Atualizar `/privacidade`: retenção da foto, finalidade (qualidade), base legal, prazo de expurgo.
- [ ] Definir política de retenção/expurgo automático de `try-on-customer-photos` (ex.: cron de N dias).
- [ ] Reavaliar opt-in explícito vs. consentimento atual na DPIA.

## Referências

- [[0006-privacidade-foto-cliente-final|ADR 0006 — Privacidade da foto (substituída)]]
- [[0002-provador-ia-fashn-replicate|ADR 0002 — Provador IA]]
- [[0004-anti-abuso-quatro-camadas|ADR 0004 — Anti-abuso]]
- Migration `20260517000010_contato_modelo_qualidade.sql`
- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm

---
**Tags:** #adr #projeto/vitrine-virtual #lgpd #privacidade #qualidade #ia

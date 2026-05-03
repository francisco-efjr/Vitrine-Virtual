# Spec de Produto v2 — Documento técnico para desenvolvimento full stack

> **Recebido em:** 2026-05-02
> **Origem:** Cliente (Francisco) entregou o documento técnico consolidando ajustes de produto + protótipo de design.
> **Status:** Spec vigente. Substitui orientações anteriores onde houver conflito.
> **Ver também:** [[2026-05-02-spec-v2-vs-implementacao|Diff vs implementação atual]] · [[spec/00-indice|Índice da spec]] · [[2026-05-02-daily|Daily 02/05]]

Este arquivo é o **dump fiel** do documento entregue pelo cliente em 02/05. Não foi reescrito — serve como fonte de verdade para discussão. As notas em `notes/spec/` quebram este conteúdo em pedaços navegáveis e ligados ao código.

---

## 1. Objetivo do desenvolvimento

Vitrine Virtual: lojas de moda criam vitrine pública de peças, clientes experimentam virtualmente uma roupa, lojas gerenciam suas peças por painel admin minimalista. **Não deve parecer e-commerce tradicional.** Foco: provador virtual, foto da peça e da simulação no centro da experiência.

## 2. Quatro grandes áreas

1. Vitrine pública do cliente final
2. Cabine / provador virtual
3. Painel admin da loja
4. Super-admin da plataforma

## 3. Diretrizes gerais

### 3.1. Visual

Identidade já definida: fundo claro/bege, serifada para títulos (Cormorant Garamond), sans para UI (DM Sans), botões discretos, bordas suaves, animações leves, foco nas imagens. Tokens: `bg`, `surface`, `accent`, `accentDark`, `border`, `success`, `danger`, `warning`.

### 3.2. Fluidez

Animações já definidas: fade, slide-up, slide-right, pop, pulse, shimmer.

### 3.3. Linguagem

**Não usar "IA" no front cliente final.** Usar: provador virtual, cabine virtual, experimentar, gerar simulação, veja como ficou em você.

## 4. Vitrine pública

### 4.1–4.2. Acesso e dados
- Pública, sem login.
- Cada peça exibe: imagem, nome, tamanhos disponíveis, preço (se loja habilitar), ação para experimentar.

### 4.3. Modos de visualização
1. **Grade**
2. **Foco / peça única** (uma por vez, navegação entre peças)

### 4.4. Filtros por categoria

Chip "Todas" + categorias baseadas nas peças disponíveis.

### 4.5. Abertura da peça
**Bottom sheet** (`PecaDrawer`) com foto, nome, tamanhos, preço opcional, CTA "Experimentar".

### 4.6. NÃO é e-commerce
**Proibido:** avaliação, estrelas, reviews, descrição longa, categoria em destaque, excesso de info comercial.

## 5. Padronização de imagens

### 5.1. Regra
Cards sempre uniformes, independente da foto ser vertical/horizontal/quadrada.

### 5.2. Implementação
**Front:** dimensões fixas, `object-fit` sem distorção, centralização, fallback visual, comportamento igual em mobile/desktop.
**Backend:** salvar original, gerar thumb padronizada, evitar layout shift.

### 5.3. Aceite
Mesma peça vertical e horizontal aparece igual no card.

## 6. Cabine / provador virtual

### 6.1–6.2. Duas fotos
1. **Foto do rosto**
2. **Foto de corpo**

A peça aparece como preview (não é upload do cliente).

### 6.3. Consentimento
Confirmar uso temporário das fotos. Promessa: imagens não armazenadas. Garantir tecnicamente.

### 6.4. Confirmação antes de gerar
Tela com: rosto + corpo + peça + botões "Trocar fotos" / "Gerar simulação".

### 6.5. Loading
Sem porcentagem, sem número. Mensagens leves: "Preparando sua simulação…", "Criando sua experiência no provador…". Barra fina shimmer.

### 6.6. Resultado
Imagem em tela cheia. Conteúdo inferior discreto: preço opcional + botão **discreto** "Falar com a loja".

## 7. Integração da geração de imagem

### 7.1. Entrada
- foto rosto · foto corpo · imagem da peça
- fundo: branco padrão / fundo personalizado da loja
- metadados peça/loja
- consentimento

### 7.2. Saída
- imagem final · status · mensagem de erro · expiração se aplicável

### 7.3. Regras
- Não armazenar fotos do cliente se interface promete que não.
- Expiração real se for armazenar temporariamente.
- Mensagens simples em erro.
- Logar erros para análise.
- Não vazar URLs privadas.

## 8. Painel da loja

### 8.1. Princípio
Não parecer painel admin genérico. Parecer ferramenta elegante de gestão de vitrine.

### 8.2. Menu lateral
Logo VV · nome da loja · navegação (Dashboard, Disponíveis, Todas as peças, Configurações).

### 8.3. URL pública
✅ `vitrine.app/atelier-laila`
❌ `vitrine.app/v/atelier-laila`

Slug não aparece para o lojista. Slug = config exclusiva do super-admin.

## 9. Dashboard

Saudação · status da vitrine · KPIs (disponíveis, vendidas, total) · botão nova peça · peças recentes. Ação "Visualizar vitrine" no topo direito, discreta.

## 10. Cadastro/edição de peça

### 10.1–10.2. Campos
- **Nome** — obrigatório
- **Preço** — opcional
- **Tamanho** — opcional, múltipla seleção
- **Categoria** — selecionável
- **Categoria personalizada** — digitável
- **Fotos** — múltiplas

### 10.3. Removidos
❌ cor · estado · descrição

### 10.4. Tamanhos padrão
PP · P · M · G · GG · 36 · 38 · 40 · 42 · 44 · Único

### 10.5. Fotos
Múltiplas (até 8) · preview · remover · escolher destaque · primeira vira destaque por default.

## 11. Lista de peças

### 11.1. Abas
**Disponíveis** · **Todas as peças**

### 11.2. Busca
Por nome ou categoria. Placeholder: "Buscar por nome ou categoria".

### 11.3. Visualização
Grade ou lista.

## 12. Vendido por tamanho

### 12.1–12.2. Regras
- Peça com 1 ou nenhum tamanho: marcar vendida remove da vitrine.
- Peça com >1 tamanho: modal pergunta qual; permite múltipla seleção; pode marcar todos.

### 12.3. Modal
"Qual tamanho foi vendido?" + chips + opção "Marcar todos os tamanhos como vendido".

## 13. Configurações da loja

### 13.1. Princípio
**Tela única.** Sem submenus. Pode ter seções visuais.

### 13.2. Campos
Logo · nome · tagline · WhatsApp · Instagram · TikTok · toggle vitrine visível · toggle mostrar preços · config fundo do provador · botão salvar.

### 13.3. Slug
**Não aparece** para o lojista.

## 14. Fundo do provador

### 14.1–14.2. Opções
1. Padrão branco (default)
2. Experiência da loja (imagem custom)

Loja pode enviar/trocar/remover. Remover volta para branco.

### 14.3. Schema sugerido
```ts
store_settings {
  store_id: string
  show_prices: boolean
  storefront_visible: boolean
  fitting_room_background_type: 'white' | 'custom'
  fitting_room_background_image_url?: string
}
```

## 15. Super-admin

### 15.1–15.2. Funcionalidades
Listar lojas · criar loja · informar e-mail da lojista · gerar slug · cota mensal de simulações · enviar magic link · ativar/desativar · uso da cabine · kill switch · orçamento mensal API.

### 15.3. Ajuste necessário
Remover prefixo `vitrine.app/v/` da criação de loja.

## 16. Auth e onboarding

### 16.1. Telas
Recuperar senha · pós-convite · redefinir senha.

### 16.2. Fluxo
**Recuperar:** e-mail → link → confirma sem revelar se conta existe.
**Convite:** super-admin cria loja → magic link → lojista define senha → painel.
**Redefinir:** link → nova senha → confirmar → validação mínima.

## 17. Modelo de dados sugerido

(Sugestão. Adaptar à stack atual, que já usa pt-br.)

```ts
stores { id, name, slug, tagline?, logo_url?, whatsapp?, instagram?, tiktok?,
         is_active, storefront_visible, show_prices,
         fitting_room_background_type: 'white'|'custom',
         fitting_room_background_url?, created_at, updated_at }

store_users { id, store_id, user_id, role: 'store_admin'|'super_admin', created_at }

products { id, store_id, name, price_cents?, category_id?, custom_category_name?,
           status: 'available'|'sold'|'inactive', created_at, updated_at }

product_sizes { id, product_id, size, status: 'available'|'sold', sold_at? }

product_images { id, product_id, original_url, thumbnail_url?, display_url?,
                 sort_order, is_featured, created_at }

try_on_sessions { id, store_id, product_id, status: 'created'|'processing'|'completed'|'failed',
                  result_url?, error_message?, expires_at?, created_at }
```

**Importante:** se fotos do cliente não forem armazenadas, não persistir. Se necessário temporário, expiração + cleanup automáticos.

## 18. Regras de negócio (resumo)

**Loja**: vitrine própria · só seus dados · slug por super-admin · toggle preço · toggle vitrine visível · config fundo · cadastra peças · marca vendido (peça/tamanho).

**Cliente final**: sem login · vê só disponíveis · preço se habilitado · experimenta · 2 fotos (rosto+corpo) · consente · vê resultado · WhatsApp.

**Produto**: nome obrigatório · preço/tamanho/categoria opcionais · cor/estado/descrição NÃO · fotos múltiplas · 1 destaque (primeira default).

**Venda por tamanho**: vender tamanho remove só ele · peça permanece se sobra tamanho · todos vendidos = peça vendida · peça sem tamanho = venda inteira.

## 19. Não funcionais

**Responsividade**: mobile · desktop · tablets se possível.
**Performance**: imagens otimizadas · thumbs · skeleton/shimmer · lazy load · sem layout shift.
**Segurança**: isolamento por loja · validação em todas as rotas · upload validado · URLs privadas · nada de só validar no front · API IA protegida · auditoria mínima.
**Privacidade**: fotos cliente só pra simulação · não armazenar permanente · expiração/cleanup · política alinhada ao comportamento real.

## 20. Backlog técnico

(Ver [[../todo|todo]] e [[spec/00-indice|índice da spec]].)

## 21. Ajustes obrigatórios

- 21.1. Remover `/v` das URLs.
- 21.2. Slug só para super-admin.
- 21.3. Remover cor/estado/descrição/aba descrição/link `/v`.
- 21.4. Reduzir uso de "IA" no front cliente.
- 21.5. Botão "Falar com a loja" mais discreto na tela final.
- 21.6. Padronização real das imagens.

## 22. Prioridades

**P0**: auth · super-admin criar loja · painel · cadastro · upload · vitrine pública por slug · drawer da peça · upload rosto/corpo · gerar simulação · resultado · WhatsApp · toggle preço · venda por tamanho.

**P1**: fundo personalizado · modo foco · filtro por categoria · busca · cota · kill switch · expiração de imagens temporárias.

**P2**: reviews · descrição · estoque avançado · analytics · favoritos · carrinho · checkout.

## 23. Princípios finais

> Menos e-commerce. Mais provador virtual.
> Menos painel administrativo. Mais experiência premium para a loja.
> Menos informação. Mais foco na imagem.

---
**Tags:** #projeto/vitrine-virtual #spec #v2 #2026-05-02

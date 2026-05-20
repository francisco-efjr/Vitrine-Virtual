# Cenários BDD Completos — Vitrine Virtual

> **Sessão QA:** 17/05/2026  
> **Testador:** Claude (QA Especialista)  
> **Cobertura:** Cliente público · Lojista · Super Admin · Acessibilidade · Mobile  
> **Formato:** BDD — Dado / Quando / Então  
> **Base:** Design Handoff v3 + codebase _app/src + bugs.md (27/04/2026)  
> **URL produção:** `https://vvsaas.vercel.app`  
> **URLs de teste:**  
> - Vitrine pública: `https://vvsaas.vercel.app/v/teste`  
> - Painel lojista: `https://vvsaas.vercel.app/admin`  
> - Painel super-admin: `https://vvsaas.vercel.app/admin/super`

---

## Legenda

| Emoji | Significado |
|-------|------------|
| ✅ | Comportamento esperado |
| ❌ | Comportamento proibido / não deve ocorrer |
| ⚠️ | Bug conhecido (referência ao bugs.md) |
| 🔒 | Regra de segurança / privacidade |
| ♿ | Requisito de acessibilidade WCAG 2.1 AA |
| 📱 | Cenário mobile específico |

---

## MÓDULO 1: VITRINE PÚBLICA (Perfil: Cliente)

### Feature: Acesso e exibição da vitrine pública

---

#### CT-VP-001: Acessar vitrine de loja ativa com peças disponíveis

**Prioridade:** P0  
**Perfil:** Cliente anônimo

```gherkin
Dado que a loja "teste" está ativa e tem peças com status "disponivel"
  E o slug "teste" está cadastrado no banco
Quando o cliente navegar para "/v/teste"
Então a página deve carregar com status 200
  E o header sticky deve exibir o logo + nome "teste"
  E o banner "✦ Cabine Virtual — experimente antes de escolher" deve ser visível
  E o grid de peças deve exibir as peças disponíveis
  E o footer deve exibir o nome da loja e links de contato
```

---

#### CT-VP-002: Vitrine de slug inexistente retorna 404

**Prioridade:** P0  
**Perfil:** Cliente anônimo

```gherkin
Dado que o slug "slug-que-nao-existe" não está cadastrado no banco
Quando o cliente navegar para "/v/slug-que-nao-existe"
Então a página deve retornar status 404
  E a página padrão de "not found" do Next.js deve ser exibida
  E nenhum dado de loja deve ser exposto
```

---

#### CT-VP-003: Vitrine de loja inativa não deve ser acessível

**Prioridade:** P0  
**Perfil:** Cliente anônimo  
**Dependência:** Loja com `ativa = false` no banco

```gherkin
Dado que a loja "espaço-modas" está com flag "ativa = false"
Quando o cliente navegar para "/v/espaco-modas"
Então a vitrine deve retornar 404 ou exibir mensagem de loja indisponível
  E nenhuma peça da loja deve ser exibida ao público
```

**Nota:** O RPC `get_vitrine_publica` filtra por `ativa = true`. Verificar comportamento real.

---

#### CT-VP-004: Vitrine sem peças exibe estado vazio

**Prioridade:** P1  
**Perfil:** Cliente anônimo

```gherkin
Dado que a loja ativa não possui peças com status "disponivel"
Quando o cliente navegar para a vitrine pública da loja
Então o header e o banner devem ser exibidos normalmente
  E a seção "Peças disponíveis" deve exibir estado vazio com mensagem amigável
  E o footer deve ser exibido normalmente
```

---

#### CT-VP-005: Preço visível quando toggle "Mostrar preços" está ativo

**Prioridade:** P1  
**Perfil:** Cliente anônimo

```gherkin
Dado que a loja tem "exibir_preco_publico = true"
  E possui peças com preço cadastrado
Quando o cliente visualizar o grid de peças
Então o preço de cada peça deve ser exibido no card
  E o formato deve ser em reais (ex: "R$ 259,90")
```

---

#### CT-VP-006: Preço oculto quando toggle "Mostrar preços" está desativado

**Prioridade:** P1  
**Perfil:** Cliente anônimo

```gherkin
Dado que a loja tem "exibir_preco_publico = false"
  E possui peças com preço cadastrado
Quando o cliente visualizar o grid de peças
Então nenhum preço deve ser exibido nos cards
  E o preço não deve vazar na resposta do RPC público ao cliente
```

**🔒 Segurança:** O campo `preco_centavos` não deve ser omitido só no front-end — verificar se o RPC `get_pecas_publicas` oculta o preço quando o flag está desativado.

---

#### CT-VP-007: Links de contato no header — WhatsApp

**Prioridade:** P1  
**Perfil:** Cliente anônimo

```gherkin
Dado que a loja tem "whatsapp_e164 = '+5511999887766'"
Quando o cliente visualizar o header da vitrine
Então um ícone de WhatsApp deve ser exibido no header
  E ao clicar, deve abrir "https://wa.me/5511999887766?text=..." em nova aba
  E a mensagem deve ser URL-encoded com o nome da loja
```

---

#### CT-VP-008: Links de contato — Instagram e TikTok

**Prioridade:** P2  
**Perfil:** Cliente anônimo

```gherkin
Dado que a loja tem "instagram = 'atelierlaila'" e "tiktok = 'atelierlaila'"
Quando o cliente visualizar o header e o footer da vitrine
Então o ícone do Instagram deve apontar para "https://instagram.com/atelierlaila"
  E o ícone do TikTok deve apontar para "https://tiktok.com/@atelierlaila"
  E ambos os links devem abrir em nova aba (target="_blank")
```

---

#### CT-VP-009: Loja sem redes sociais não exibe ícones de contato

**Prioridade:** P2

```gherkin
Dado que a loja tem "instagram = null", "tiktok = null" e "whatsapp_e164 = null"
Quando o cliente visualizar a vitrine
Então nenhum ícone de rede social deve ser exibido no header
  E nenhum ícone de rede social deve ser exibido no footer
```

---

#### CT-VP-010: Tagline da loja exibida no header e footer

**Prioridade:** P3

```gherkin
Dado que a loja tem "tagline = 'Moda com alma e estilo próprio'"
Quando o cliente visualizar a vitrine
Então a tagline deve aparecer abaixo do nome da loja no header (em itálico, truncada)
  E a tagline deve aparecer no footer em uppercase
```

---

#### CT-VP-011: Logo da loja exibida no header e footer

**Prioridade:** P2

```gherkin
Dado que a loja tem uma logo cadastrada no Supabase Storage
Quando o cliente visualizar a vitrine
Então a logo deve ser exibida no header como imagem 38x38px arredondada
  E a logo deve ser exibida no footer como imagem 54x54px arredondada
  E nenhum erro 404 de imagem deve ocorrer (signed URL válido)
```

---

#### CT-VP-012: Card de peça exibe foto, nome e tamanho

**Prioridade:** P0

```gherkin
Dado que uma peça disponível tem foto principal, nome e tamanho cadastrados
Quando o cliente visualizar o grid de peças
Então o card deve exibir a foto como imagem em aspect-ratio portrait
  E o nome da peça deve ser exibido abaixo da foto
  E o tamanho (ex: "M") deve ser exibido no card
  E ao passar o mouse, o botão "Provar" deve aparecer com animação hover
```

---

#### CT-VP-013: Card de peça sem foto exibe placeholder

**Prioridade:** P2

```gherkin
Dado que uma peça disponível não tem foto principal cadastrada
Quando o cliente visualizar o grid de peças
Então o card deve exibir um placeholder visual (fundo cinza claro / ícone)
  E nenhum erro de imagem quebrada deve aparecer
```

---

#### CT-VP-014: SEO — metadados gerados corretamente

**Prioridade:** P2

```gherkin
Dado que a loja "teste" tem nome "Loja Teste" e tagline "A melhor moda"
Quando o Google rastrear ou o cliente inspecionar o <head> de "/v/teste"
Então "title" deve ser "Loja Teste · Vitrine Virtual"
  E "description" deve conter a tagline "A melhor moda"
  E "og:title" deve ser "Loja Teste"
  E "og:type" deve ser "website"
```

---

### Feature: Cabine Virtual (Try-On) — fluxo do cliente

---

#### CT-TRYON-001: Abertura do modal ao clicar em "Provar"

**Prioridade:** P0  
**Perfil:** Cliente anônimo

```gherkin
Dado que o cliente está na vitrine pública com pelo menos uma peça disponível
  E o kill switch global está ativo (try_on_enabled = true)
  E a loja não excedeu a cota mensal
Quando o cliente clicar no botão "Provar" de uma peça
Então o modal da Cabine Virtual deve abrir
  E o Step 1 "Envie uma foto sua" deve ser exibido
  E o checkbox de consentimento LGPD deve estar desmarcado
  E os botões de upload de foto devem estar desabilitados até o checkbox ser marcado
  E o scroll da página deve ser bloqueado (overflow: hidden no body)
```

---

#### CT-TRYON-002: Checkbox de consentimento habilita upload

**Prioridade:** P0  
**Perfil:** Cliente anônimo

```gherkin
Dado que o modal da Cabine Virtual está aberto no Step 1
  E o checkbox de consentimento está desmarcado
Quando o cliente marcar o checkbox de consentimento LGPD
Então os botões "Tirar foto" e "Escolher da galeria" devem ser habilitados
  E o cliente deve conseguir selecionar uma foto
Quando o cliente desmarcar o checkbox
Então os botões devem voltar a ficar desabilitados
```

---

#### CT-TRYON-003: Seleção de foto da galeria — formatos aceitos

**Prioridade:** P0

```gherkin
Dado que o checkbox de consentimento está marcado
  E o cliente clicou em "Escolher da galeria"
Quando o cliente selecionar um arquivo JPEG válido (< 10MB)
Então a foto deve aparecer no preview do Step 1
  E o botão "Continuar" deve ser habilitado
Quando o cliente repetir o teste com PNG, WebP, AVIF, HEIC e HEIF
Então todos os formatos devem ser aceitos e exibidos no preview
```

---

#### CT-TRYON-004: Formatos de arquivo inválidos são rejeitados

**Prioridade:** P1

```gherkin
Dado que o checkbox de consentimento está marcado
Quando o cliente tentar enviar um arquivo PDF
Então o sistema deve exibir mensagem de erro "Formato não suportado"
  E o Step 1 deve permanecer ativo (sem avançar)
Quando o cliente tentar enviar um arquivo MP4
Então o mesmo comportamento de rejeição deve ocorrer
```

---

#### CT-TRYON-005: Confirmação no Step 2 e início do processamento

**Prioridade:** P0

```gherkin
Dado que o cliente enviou uma foto válida no Step 1
Quando o cliente clicar em "Continuar" no Step 1
Então o modal deve avançar para o Step 2 "Confirme sua foto"
  E a foto selecionada deve ser exibida em preview maior
  E os botões "Trocar foto" e "Experimentar agora" devem estar visíveis
Quando o cliente clicar em "Experimentar agora"
Então o Step 3 de processamento deve aparecer com barra de progresso animada
  E a requisição POST /api/try-on deve ser enviada com multipart/form-data
  E os campos "customerPhoto", "peca_id", "turnstile_token" e "consent" devem estar presentes
```

---

#### CT-TRYON-006: Exibição do resultado do try-on

**Prioridade:** P0

```gherkin
Dado que o POST /api/try-on foi processado com sucesso
  E a resposta contém a URL da imagem gerada
Quando a resposta retornar ao modal
Então o Step 4 "Resultado" deve ser exibido
  E a imagem gerada pelo provador IA deve ser exibida
  E um botão "Baixar" deve estar disponível (download com watermark)
  E um botão de WhatsApp deve estar disponível com mensagem pré-preenchida
  E os botões de feedback (👍 / 👎) devem estar visíveis
```

---

#### CT-TRYON-007: Feedback positivo e negativo do resultado

**Prioridade:** P2

```gherkin
Dado que o resultado do try-on foi exibido no Step 4
Quando o cliente clicar no botão 👍 (feedback positivo)
Então a requisição POST /api/try-on/feedback deve ser enviada com { rating: 'positive' }
  E o botão deve ser visualmente marcado como selecionado
Quando o cliente clicar em 👎 e opcionalmente digitar um comentário
Então a requisição deve incluir { rating: 'negative', comment: '<texto>' }
```

---

#### CT-TRYON-008: Download com watermark

**Prioridade:** P2

```gherkin
Dado que o resultado do try-on foi exibido no Step 4
Quando o cliente clicar em "Baixar"
Então o canvas deve compor a imagem gerada com o watermark "Vitrine Virtual"
  E o download deve iniciar com nome de arquivo descritivo
  E a imagem original sem watermark não deve ser oferecida para download direto
```

---

#### CT-TRYON-009: Kill switch desativado bloqueia try-on

**Prioridade:** P0

```gherkin
Dado que "system_settings.try_on_enabled = false" no banco
Quando o cliente enviar foto e clicar em "Experimentar agora"
Então a API deve retornar HTTP 503
  E o modal deve exibir o Step de erro com mensagem amigável
  E a mensagem deve indicar que o recurso está temporariamente indisponível
  E nenhuma chamada ao provador IA deve ser realizada
```

---

#### CT-TRYON-010: Cota mensal da loja esgotada

**Prioridade:** P0

```gherkin
Dado que a loja consumiu todos os seus usos mensais (try_on_uses >= cota_try_on_mensal)
Quando o cliente enviar foto e clicar em "Experimentar agora"
Então a API deve retornar HTTP 429 com código "quota_exceeded"
  E o modal deve exibir mensagem de cota esgotada
  E nenhuma chamada ao provador IA deve ser realizada
```

---

#### CT-TRYON-011: Rate limit por IP — 5 tentativas por hora

**Prioridade:** P1

```gherkin
Dado que o mesmo IP realizou 5 requisições à /api/try-on na última hora
Quando o cliente tentar uma 6ª requisição
Então a API deve retornar HTTP 429 com código "rate_limit"
  E o modal deve exibir mensagem informando o limite temporário
  E a janela de rate limit deve redefinir após 1 hora (sliding window)
```

---

#### CT-TRYON-012: Fechar modal com tecla Escape

**Prioridade:** P2

```gherkin
Dado que o modal da Cabine Virtual está aberto em qualquer step
Quando o cliente pressionar a tecla Escape
Então o modal deve fechar
  E o scroll da página deve ser restaurado (overflow: auto no body)
  E o estado do modal deve ser resetado para o Step 1 no próximo acesso
```

---

#### CT-TRYON-013: Botão "Trocar foto" retorna ao Step 1

**Prioridade:** P2

```gherkin
Dado que o modal está no Step 2 (Confirme sua foto)
Quando o cliente clicar em "Trocar foto"
Então o modal deve retornar ao Step 1
  E a foto anterior deve ser removida do preview
  E o cliente pode selecionar uma nova foto
```

---

#### CT-TRYON-014: Erro do provedor IA — exibição de estado de erro

**Prioridade:** P1

```gherkin
Dado que o provedor IA (FASHN) falhou ou retornou erro após retentativas
Quando o POST /api/try-on retornar HTTP 500 com código "provider_failed"
Então o modal deve exibir o Step de erro
  E a mensagem deve ser amigável (sem stack trace ou detalhes técnicos)
  E um botão "Tentar novamente" deve estar disponível
```

---

#### CT-TRYON-015: LGPD — foto não é armazenada permanentemente

**Prioridade:** P0  
🔒 **Conformidade LGPD**

```gherkin
Dado que o cliente realizou um try-on com sua foto
Quando verificarmos os buckets do Supabase Storage após a requisição
Então a foto do cliente não deve estar armazenada permanentemente no Storage
  E se houver armazenamento temporário, deve ter TTL máximo de 24 horas
  E a URL do resultado da IA deve expirar em no máximo 24 horas
```

---

#### CT-TRYON-016: [SECURITY] Turnstile bypass hardcoded em produção

**Prioridade:** P0  
🔒 **BUG DE SEGURANÇA** — `try-on-modal.tsx` envia `turnstile_token: 'dev-bypass'`

```gherkin
Dado que o modal da Cabine Virtual está em produção (vvsaas.vercel.app)
Quando o cliente abrir a Cabine Virtual e inspecionar a requisição POST /api/try-on
Então o campo "turnstile_token" deve ser um token real do Cloudflare Turnstile
  E NÃO deve ser a string literal "dev-bypass"
```

**Observação:** Código atual em `try-on-modal.tsx` usa `turnstile_token: 'dev-bypass'` hardcoded. A camada 1 de anti-abuso (Turnstile) está completamente bypassed em produção. O `turnstile.ts` retorna `true` quando `TURNSTILE_SECRET_KEY` não está configurado, mas em prod a chave existe e o valor `dev-bypass` falhará corretamente — porém a lógica do front-end nunca obtém um token real. **Resultado:** ou todos os try-ons falham com `turnstile_failed`, ou a proteção está inativa. Verificar comportamento atual.

---

#### CT-TRYON-017: Captura de câmera em dispositivo mobile

**Prioridade:** P1  
📱 **Mobile**

```gherkin
Dado que o cliente está acessando a vitrine em um smartphone (iOS ou Android)
  E o checkbox de consentimento está marcado
Quando o cliente clicar em "Tirar foto"
Então a câmera frontal do dispositivo deve ser ativada (capture="user")
  E o cliente deve conseguir tirar uma selfie
  E a foto capturada deve aparecer no preview do Step 1
```

---

#### CT-TRYON-018: Modal em viewport mobile (< 768px)

**Prioridade:** P1  
📱 **Mobile**

```gherkin
Dado que o cliente está em viewport 390px (iPhone 14)
Quando o modal da Cabine Virtual estiver aberto
Então o modal deve ocupar a tela completa ou ser facilmente utilizável
  E todos os botões (checkbox, "Tirar foto", "Escolher da galeria", "Continuar") devem ter área de toque mínima de 44x44px
  E nenhum elemento deve estar cortado pela borda da tela
  E o Step de processamento deve ser legível
```

---

#### CT-TRYON-019: Peça inativa não pode ser usada no try-on

**Prioridade:** P1

```gherkin
Dado que uma peça tem status "vendida" ou foi removida do banco
Quando um cliente tentar enviar uma requisição POST /api/try-on com o peca_id dessa peça
Então a API deve retornar HTTP 404 com código "peca_unavailable"
  E nenhuma imagem deve ser gerada
```

---

## MÓDULO 2: PAINEL DO LOJISTA (Perfil: Lojista)

### Feature: Dashboard do lojista

---

#### CT-LOJA-001: Dashboard exibe métricas corretas

**Prioridade:** P0  
**Perfil:** Lojista autenticado

```gherkin
Dado que o lojista "teste@me.com" está autenticado
  E possui peças com diferentes status no banco
Quando acessar "/admin/dashboard"
Então os KPIs devem refletir os dados reais da loja:
  - "Disponíveis": contagem de peças com status="disponivel"
  - "Vendidas": contagem de peças com status="vendida" (todas as datas)
  - "Total": total de peças cadastradas
  E a saudação deve usar o primeiro nome do perfil (ex: "Bom dia, Francisco 👋")
  E os botões "Ver vitrine" e "Ver experiência do cliente" devem estar presentes
```

---

#### CT-LOJA-002: Cota da Cabine exibida no dashboard

**Prioridade:** P1

```gherkin
Dado que a loja consumiu 50 de 200 usos mensais da Cabine
Quando o lojista acessar o dashboard
Então o card "Cota da Cabine" deve exibir "50 de 200 usos"
  E a barra de progresso deve estar em 25% de largura
  E o badge de status deve usar a variante "neutral" (abaixo de 80%)
  E o texto deve informar "Restam 150 usos este mês."
```

---

#### CT-LOJA-003: Cota da Cabine em estado crítico (> 80%)

**Prioridade:** P1

```gherkin
Dado que a loja consumiu 170 de 200 usos mensais (85%)
Quando o lojista acessar o dashboard
Então o badge de cota deve usar a variante "warning"
  E a barra de progresso deve estar em 85% (cor gradient accent→warning)
```

---

#### CT-LOJA-004: Valor total disponível e total vendido

**Prioridade:** P1

```gherkin
Dado que a loja tem peças disponíveis totalizando R$ 1.500,00
  E peças vendidas totalizando R$ 800,00
Quando o lojista acessar o dashboard
Então o card "Valor disponível" deve exibir "R$ 1.500,00"
  E o card "Total vendido" deve exibir "R$ 800,00" em cor de destaque (accent-dark)
```

---

#### CT-LOJA-005: Link "Ver vitrine" abre vitrine pública em nova aba

**Prioridade:** P1

```gherkin
Dado que o lojista está no dashboard
Quando clicar em "Ver vitrine"
Então deve abrir "/v/{slug}" em nova aba (target="_blank")
  E a vitrine da própria loja deve ser exibida
```

---

#### CT-LOJA-006: Peças recentes listadas no dashboard

**Prioridade:** P2

```gherkin
Dado que a loja tem 10 peças cadastradas
Quando o lojista acessar o dashboard
Então as 6 peças mais recentes devem ser listadas na seção "Peças recentes"
  E cada linha deve exibir: foto (48x36px), nome, categoria+tamanho, preço, badge de status
  E o botão "Cadastrar peça" deve redirecionar para "/admin/pecas"
```

---

### Feature: Gestão de peças (CRUD)

---

#### CT-PECA-001: Listar peças da loja

**Prioridade:** P0

```gherkin
Dado que o lojista está autenticado e acessa "/admin/pecas"
Quando a página carregar
Então somente as peças da própria loja devem ser exibidas (isolamento RLS)
  E peças de outras lojas não devem aparecer (mesmo via manipulação de parâmetros)
  E as peças devem ser ordenadas por data de criação (mais recentes primeiro)
```

---

#### CT-PECA-002: Filtro "somente disponíveis"

**Prioridade:** P1

```gherkin
Dado que a loja tem peças com status "disponivel" e "vendida"
Quando o lojista ativar o filtro "somente disponíveis"
Então apenas peças com status="disponivel" devem ser exibidas na lista
  E peças com status="vendida" devem ser ocultadas
Quando o lojista desativar o filtro
Então todas as peças devem ser exibidas novamente
```

---

#### CT-PECA-003: Busca por nome de peça

**Prioridade:** P1

```gherkin
Dado que a loja tem peças "Vestido Azul", "Camiseta Rosa" e "Saia Preta"
Quando o lojista digitar "azul" no campo de busca
Então apenas "Vestido Azul" deve ser exibido na lista
  E a busca deve ser case-insensitive
  E a busca deve funcionar enquanto o lojista digita (sem necessidade de pressionar Enter)
```

---

#### CT-PECA-004: Cadastrar nova peça — campos obrigatórios

**Prioridade:** P0

```gherkin
Dado que o lojista clicou em "Cadastrar peça" ou acessou "/admin/pecas"
Quando preencher o formulário com:
  - Nome: "Vestido Midi"
  - Preço: "299,90"
  - Tamanho: "M"
  - Status: "disponivel"
  E clicar em "Salvar"
Então a peça deve ser criada no banco associada ao loja_id correto
  E o lojista deve ser redirecionado ou ver confirmação de sucesso
  E a peça deve aparecer na lista de peças
```

---

#### CT-PECA-005: Cadastrar peça sem foto

**Prioridade:** P2

```gherkin
Dado que o lojista está criando uma nova peça sem enviar foto
Quando preencher apenas nome, preço e clicar em "Salvar"
Então a peça deve ser criada com sucesso (foto é opcional)
  E o card da peça deve exibir placeholder de imagem
```

---

#### CT-PECA-006: Upload de foto principal da peça

**Prioridade:** P0

```gherkin
Dado que o lojista está no formulário de peça
Quando fazer upload de uma imagem JPEG de 2MB
Então a imagem deve ser enviada ao Supabase Storage no bucket "pecas-fotos"
  E o caminho deve seguir o padrão "{loja_id}/{peca_id}/{filename}"
  E a URL assinada deve ser gerada e o preview exibido
  E a peça deve ser salva com foto_principal_path correto
```

---

#### CT-PECA-007: Upload de foto — tamanho máximo excedido

**Prioridade:** P1

```gherkin
Dado que o lojista está no formulário de peça
Quando tentar fazer upload de uma imagem maior que 5MB (limite do formulário)
Então o sistema deve exibir mensagem de erro de tamanho
  E o upload não deve ser realizado
```

---

#### CT-PECA-008: Até 8 fotos por peça

**Prioridade:** P1

```gherkin
Dado que o lojista está editando uma peça com 7 fotos
Quando adicionar mais uma foto (8ª)
Então a 8ª foto deve ser aceita e exibida
Quando tentar adicionar uma 9ª foto
Então o sistema deve bloquear ou exibir mensagem de limite atingido
```

---

#### CT-PECA-009: Editar peça existente

**Prioridade:** P0

```gherkin
Dado que existe uma peça "Vestido Midi" com preço R$ 299,90
Quando o lojista abrir o formulário de edição e alterar o preço para "349,90"
  E clicar em "Salvar"
Então o preço da peça no banco deve ser atualizado para 34990 centavos
  E a vitrine pública deve exibir o novo preço após reload
  E o banco de dados não deve registrar tentativa PATCH com status padrão incorreto
```

**Referência de regressão:** BUG de PATCH que redefinindo status para default — verificar unit test em `validators/peca.test.ts`.

---

#### CT-PECA-010: Marcar peça como vendida

**Prioridade:** P0

```gherkin
Dado que uma peça está com status "disponivel"
Quando o lojista clicar em "Marcar como vendida" na lista de peças
Então o status da peça deve ser atualizado para "vendida" no banco
  E a peça deve deixar de aparecer na vitrine pública
  E o KPI "Vendidas" no dashboard deve ser atualizado
  E o KPI "Disponíveis" deve diminuir em 1
```

---

#### CT-PECA-011: Reativar peça vendida para disponível

**Prioridade:** P1

```gherkin
Dado que uma peça está com status "vendida"
Quando o lojista editar a peça e mudar o status para "disponivel"
  E salvar
Então a peça deve voltar a aparecer na vitrine pública
  E os KPIs do dashboard devem ser atualizados
```

---

#### CT-PECA-012: Deletar peça

**Prioridade:** P1

```gherkin
Dado que uma peça existe na lista
Quando o lojista clicar em "Deletar" e confirmar a ação
Então a peça deve ser removida do banco
  E as fotos associadas devem ser removidas do Storage
  E a peça não deve mais aparecer na vitrine pública
```

---

#### CT-PECA-013: Isolamento RLS — lojista não acessa peças de outra loja

**Prioridade:** P0  
🔒 **Segurança multi-tenant**

```gherkin
Dado que o lojista "teste@me.com" está autenticado
Quando fizer GET /api/pecas diretamente (via curl ou browser)
Então apenas peças associadas à loja "teste" devem ser retornadas
  E peças de "Bella's Store" ou qualquer outra loja não devem aparecer
Quando tentar DELETE /api/pecas/{id_de_peca_de_outra_loja}
Então a API deve retornar 403 ou 404
  E a peça da outra loja deve permanecer intacta no banco
```

---

#### CT-PECA-014: Exportar peças como CSV

**Prioridade:** P2

```gherkin
Dado que o lojista tem peças cadastradas
Quando acionar a exportação CSV na tela de peças
Então um arquivo .csv deve ser baixado
  E o arquivo deve conter BOM (Byte Order Mark) para compatibilidade com Excel
  E as colunas devem incluir: nome, preço, tamanho, status, data de criação
  E caracteres especiais (acentos, vírgulas) devem ser corretamente escapados
```

---

### Feature: Configurações da loja

---

#### CT-CONFIG-001: Salvar nome e tagline da loja

**Prioridade:** P0

```gherkin
Dado que o lojista está na tela "Configurações" (/admin/configuracoes)
Quando alterar o nome para "Nova Loja Teste"
  E alterar a tagline para "Moda com propósito"
  E clicar em "Salvar"
Então o PATCH /api/loja deve ser enviado com os novos valores
  E o banco deve ser atualizado
  E o feedback "✓ Salvo" deve aparecer por 2,2 segundos
  E a vitrine pública deve exibir o novo nome após reload
```

---

#### CT-CONFIG-002: Upload de logo da loja

**Prioridade:** P1

```gherkin
Dado que o lojista está na seção "Identidade" das configurações
Quando clicar no tile de logo e selecionar uma imagem PNG de 500KB
Então o POST /api/loja/assets deve ser chamado com kind="logo"
  E a imagem deve ser armazenada no Supabase Storage
  E o preview da logo deve ser atualizado imediatamente com cache-buster (?t=timestamp)
  E o estado "Enviando…" deve ser exibido durante o upload
```

---

#### CT-CONFIG-003: Remover logo da loja

**Prioridade:** P2

```gherkin
Dado que a loja tem uma logo cadastrada
Quando o lojista clicar em "Remover" na seção de logo
Então o DELETE /api/loja/assets?kind=logo deve ser enviado
  E a logo deve ser removida do Storage
  E o tile de logo deve voltar ao estado placeholder (ícone + "Logo")
```

---

#### CT-CONFIG-004: Configurar WhatsApp com normalização E.164

**Prioridade:** P1

```gherkin
Dado que o lojista está na seção "Contato & redes"
Quando digitar "(11) 99887-7665" no campo WhatsApp e clicar fora do campo (blur)
Então o valor deve ser normalizado para "+5511998877665" (formato E.164)
  E o valor normalizado deve ser salvo no banco ao clicar "Salvar"
Quando digitar "11998877665" (sem código de país)
Então deve ser normalizado para "+11998877665"
```

---

#### CT-CONFIG-005: Toggle "Vitrine visível para clientes"

**Prioridade:** P0

```gherkin
Dado que o toggle "Vitrine visível para clientes" está ativado
Quando o lojista desativá-lo e clicar em "Salvar"
Então o PATCH /api/loja deve enviar "vitrine_publica_visivel: false"
  E a vitrine pública deve retornar 404 ou mensagem de indisponibilidade
  E o dashboard deve continuar acessível ao lojista
```

---

#### CT-CONFIG-006: Toggle "Mostrar preços" na vitrine

**Prioridade:** P1

```gherkin
Dado que o toggle "Mostrar preços" está ativado
Quando o lojista desativá-lo e clicar em "Salvar"
Então o PATCH /api/loja deve enviar "exibir_preco_publico: false"
  E a vitrine pública não deve exibir preços após reload
  E as peças ainda devem ser exibidas normalmente
```

---

#### CT-CONFIG-007: Escolha de fundo do provador — branco padrão

**Prioridade:** P2

```gherkin
Dado que o lojista está na seção "Provador virtual"
Quando clicar no tile "Padrão branco" (se não estiver selecionado)
  E clicar em "Salvar"
Então o PATCH /api/loja deve enviar "provador_fundo_tipo: 'branco'"
  E o provador na vitrine pública deve usar fundo branco
```

---

#### CT-CONFIG-008: Upload de fundo personalizado do provador

**Prioridade:** P2

```gherkin
Dado que o lojista está na seção "Provador virtual"
Quando clicar no tile "Experiência da loja" sem fundo cadastrado
Então o seletor de arquivo deve abrir
Quando selecionar uma imagem JPEG
Então o POST /api/loja/assets deve ser chamado com kind="provador_fundo"
  E o tile "Experiência da loja" deve exibir preview da imagem
  E os botões "Trocar" e "Remover" devem aparecer
  E o provador_fundo_tipo deve ser salvo como "personalizado"
```

---

#### CT-CONFIG-009: Salvar configurações sem alterações não cria estado de erro

**Prioridade:** P3

```gherkin
Dado que o lojista está na tela de configurações com os dados já salvos
Quando clicar em "Salvar" sem alterar nenhum campo
Então o PATCH /api/loja deve ser enviado com os valores atuais
  E o feedback "✓ Salvo" deve aparecer
  E nenhuma mensagem de erro deve ser exibida
```

---

#### CT-CONFIG-010: Tagline com limite de 140 caracteres

**Prioridade:** P3

```gherkin
Dado que o lojista está editando a tagline
Quando digitar 140 caracteres exatos
Então o contador deve exibir "140/140"
  E o campo deve aceitar o texto
Quando tentar digitar o 141º caractere
Então o campo deve bloqueá-lo (maxLength="140")
```

---

## MÓDULO 3: PAINEL SUPER ADMIN (Perfil: Super Admin)

> **Nota:** Cenários do arquivo `cenarios-super-admin.md` (CT-SA-001 a CT-SA-015) já cobrem este módulo.  
> Os cenários abaixo complementam com casos de borda e cenários não cobertos anteriormente.

---

### Feature: Gestão avançada de lojas

---

#### CT-SA-016: Criação de loja com slug reservado é rejeitada

**Prioridade:** P1

```gherkin
Dado que os slugs ["admin", "api", "auth", "login", "super", "privacidade", "termos", "v"] são reservados
Quando o super admin tentar criar uma loja com slug "admin"
Então o backend deve rejeitar com erro "Slug reservado ou inválido"
  E a loja não deve ser criada no banco
Quando tentar com slugs "api", "auth", "login", "super", "v"
Então todos devem ser rejeitados com o mesmo erro
```

---

#### CT-SA-017: Slug com caracteres inválidos é rejeitado

**Prioridade:** P1

```gherkin
Dado que o super admin está criando uma loja
Quando informar um slug com espaços, acentos ou caracteres especiais ("loja bonita", "laïla", "store@2024")
Então o backend deve normalizar ou rejeitar o slug inválido
  E a loja não deve ser criada com um slug que cause erros de roteamento
```

---

#### CT-SA-018: KPI de try-ons estima custo corretamente

**Prioridade:** P2

```gherkin
Dado que o sistema registrou 100 try-ons no mês atual em todas as lojas
  E o custo por geração é de US$ 0,06
Quando o super admin acessar o painel
Então o KPI "Try-ons este mês" deve exibir "100"
  E o custo estimado deve ser "≈ US$ 6,00"
```

---

#### CT-SA-019: Kill switch OFF bloqueia try-on para todas as lojas

**Prioridade:** P0

```gherkin
Dado que o kill switch está desativado (try_on_enabled = false)
  E múltiplas lojas estão ativas com cotas disponíveis
Quando qualquer cliente tentar usar a Cabine Virtual em qualquer vitrine
Então todas as tentativas devem retornar 503 "kill_switch_off"
  E nenhuma requisição ao provedor IA deve ser realizada
  E o custo mensal de IA deve permanecer em zero
```

---

#### CT-SA-020: Cota individual por loja é isolada

**Prioridade:** P1

```gherkin
Dado que "Loja A" tem cota de 10 usos e "Loja B" tem cota de 200 usos
  E "Loja A" consumiu todos os 10 usos
Quando um cliente tentar usar a Cabine Virtual na "Loja A"
Então deve receber erro 429 "quota_exceeded"
Quando um cliente tentar usar a Cabine Virtual na "Loja B"
Então deve funcionar normalmente (cota da Loja B não é afetada pela Loja A)
```

---

## MÓDULO 4: ACESSIBILIDADE (WCAG 2.1 AA)

---

### Feature: Navegação por teclado

---

#### CT-A11Y-001: Header da vitrine pública — navegação por Tab

**Prioridade:** P1  
♿

```gherkin
Dado que o cliente está na vitrine pública com teclado
Quando pressionar Tab repetidamente
Então o foco deve percorrer: logo/nome → links de contato (Instagram, TikTok, WhatsApp) → grid de peças
  E cada elemento focável deve ter indicador visual de foco visível (outline ou ring)
  E a ordem de tabulação deve ser lógica e seguir a ordem visual da página
```

---

#### CT-A11Y-002: Modal da Cabine Virtual — foco aprisionado

**Prioridade:** P1  
♿ WCAG 2.1 — 2.1.2 No Keyboard Trap

```gherkin
Dado que o modal da Cabine Virtual está aberto
Quando o cliente navegar com Tab
Então o foco deve ficar aprisionado dentro do modal (focus trap)
  E Tab no último elemento focável deve retornar ao primeiro
  E Shift+Tab deve navegar em ordem reversa dentro do modal
Quando pressionar Escape
Então o modal deve fechar e o foco deve retornar ao botão "Provar" que abriu o modal
```

---

#### CT-A11Y-003: Checkbox de consentimento — operação por teclado

**Prioridade:** P1  
♿

```gherkin
Dado que o modal está no Step 1 com checkbox desmarcado
Quando o cliente navegar com Tab até o checkbox e pressionar Espaço
Então o checkbox deve ser marcado
  E os botões de upload devem ser habilitados
  E o estado habilitado deve ser anunciado por leitores de tela (aria-disabled="false")
```

---

#### CT-A11Y-004: Contraste de cor — texto sobre fundo

**Prioridade:** P1  
♿ WCAG 2.1 — 1.4.3 Contrast (Minimum) — razão mínima 4.5:1 para texto normal

```gherkin
Dado que a vitrine pública usa as cores: ink (#2d2825) sobre bg (#f8f5f0)
  E o painel admin usa as mesmas variáveis CSS
Quando medir o contraste com ferramenta automatizada (axe, WAVE ou Lighthouse)
Então o contraste de texto normal deve ser ≥ 4.5:1
  E o contraste de texto grande (≥ 18px bold ou ≥ 24px normal) deve ser ≥ 3:1
  E o texto de cor "ink-3" (cor terciária) deve ser verificado nos estados desativados
```

---

#### CT-A11Y-005: Imagens com atributo alt

**Prioridade:** P1  
♿ WCAG 2.1 — 1.1.1 Non-text Content

```gherkin
Dado que a vitrine exibe fotos de peças e logos
Quando inspecionar os elementos <img> da página
Então cada foto de peça deve ter alt descritivo (ex: alt="{nome da peça}")
  E a logo da loja deve ter alt="{nome da loja}"
  E imagens decorativas devem ter alt="" (string vazia, não ausente)
  E nenhum atributo alt deve estar ausente
```

---

#### CT-A11Y-006: Botões com label acessível

**Prioridade:** P1  
♿

```gherkin
Dado que a vitrine tem botões de ícone (Instagram, TikTok, WhatsApp) sem texto visível
Quando o leitor de tela ler cada botão
Então cada botão deve ter aria-label descritivo (ex: "Instagram da loja", "Enviar mensagem no WhatsApp")
  E botões de toggle no painel admin devem ter aria-checked e label descritivo
```

---

#### CT-A11Y-007: Formulários com label associado

**Prioridade:** P1  
♿ WCAG 2.1 — 1.3.1 Info and Relationships

```gherkin
Dado que o painel admin tem formulários de criação/edição de peça e configurações
Quando inspecionar os inputs do formulário
Então cada campo de input deve ter um <label> explicitamente associado (for/id) ou aria-label
  E os campos de erro devem ser anunciados com aria-describedby ou aria-live
```

---

#### CT-A11Y-008: Tamanho mínimo de área de toque (mobile)

**Prioridade:** P1  
♿ WCAG 2.5.5 Target Size  
📱

```gherkin
Dado que a vitrine é acessada em mobile (viewport 390px)
Quando medir os alvos interativos (botões, ícones, toggles)
Então cada alvo interativo deve ter mínimo 44×44px de área de toque
  E os ícones de redes sociais no header e footer devem ter padding adequado
  E os botões "Provar" nos cards devem ser facilmente clicáveis
```

---

#### CT-A11Y-009: Indicadores de loading acessíveis

**Prioridade:** P2  
♿

```gherkin
Dado que o modal da Cabine está no Step 3 (Processando)
Quando o leitor de tela ler a tela
Então deve haver uma mensagem de status como aria-live="polite" indicando "Processando..."
  E a barra de progresso animada deve ter role="progressbar" ou equivalente
  E o usuário cego deve ser informado quando o resultado estiver disponível
```

---

## MÓDULO 5: CENÁRIOS MOBILE E RESPONSIVIDADE

---

#### CT-MOB-001: Vitrine em viewport 390px (iPhone 14)

**Prioridade:** P1  
📱

```gherkin
Dado que o cliente acessa a vitrine em um iPhone 14 (390px)
Quando a página carregar
Então o header deve ser compacto e usar a logo 38px
  E o grid de peças deve ter no máximo 2 colunas
  E nenhum conteúdo deve ter overflow horizontal (scroll lateral)
  E o texto do banner "Cabine Virtual" deve ser legível
```

---

#### CT-MOB-002: Painel admin em mobile — sidebar colapsada

**Prioridade:** P1  
📱

```gherkin
Dado que o lojista acessa "/admin" em smartphone (390px)
Quando a página carregar
Então a sidebar deve estar colapsada ou substituída por menu hambúrguer
  E o conteúdo principal (dashboard, lista de peças) deve ser totalmente visível
  E os KPI cards devem reorganizar para 2 colunas (não 3)
```

---

#### CT-MOB-003: Formulário de peça em mobile

**Prioridade:** P1  
📱

```gherkin
Dado que o lojista está no formulário de criação de peça em mobile
Quando preencher o formulário
Então todos os campos devem ser totalmente acessíveis sem zoom
  E o upload de foto deve funcionar via galeria do dispositivo
  E o botão "Salvar" deve estar visível sem scroll excessivo
```

---

#### CT-MOB-004: Try-on modal — Step de processamento em mobile

**Prioridade:** P1  
📱

```gherkin
Dado que o cliente está no Step 3 (Processando) em mobile
Quando aguardar o resultado do provador IA (pode levar até 30s)
Então a animação de loading deve ser visível e fluida
  E o texto "Preparando sua experimentação..." deve ser legível em 390px
  E a página não deve ser bloqueada (outro elemento não pode sobrepor o modal)
```

---

#### CT-MOB-005: Compartilhamento do resultado via WhatsApp em mobile

**Prioridade:** P2  
📱

```gherkin
Dado que o resultado do try-on foi exibido em mobile
Quando o cliente clicar no botão de WhatsApp
Então o app do WhatsApp deve ser aberto (deep link wa.me) no dispositivo
  E a mensagem pré-preenchida deve incluir o nome da loja e um convite
```

---

## MÓDULO 6: SEGURANÇA E EDGE CASES

---

#### CT-SEC-001: Injeção de slug malicioso na URL

**Prioridade:** P1  
🔒

```gherkin
Dado que um atacante tentar injeção via slug
Quando navegar para "/v/<script>alert(1)</script>"
Então o Next.js deve sanitizar o parâmetro antes de qualquer uso
  E nenhum script deve ser executado (XSS prevenido)
  E a página deve retornar 404 com slug não encontrado
```

---

#### CT-SEC-002: API de peças sem autenticação

**Prioridade:** P0  
🔒

```gherkin
Dado que um atacante não está autenticado
Quando fizer GET /api/pecas sem cookie de sessão
Então deve receber HTTP 401 ou 403
  E nenhuma peça deve ser retornada
Quando fizer POST /api/pecas com payload de peça
Então deve receber HTTP 401 ou 403
  E nenhuma peça deve ser criada no banco
```

---

#### CT-SEC-003: API de try-on sem peca_id válido

**Prioridade:** P1  
🔒

```gherkin
Dado que um atacante envia requisição POST /api/try-on com peca_id forjado
Quando o peca_id não pertencer a nenhuma peça ativa no banco
Então a API deve retornar HTTP 404 "peca_unavailable"
  E nenhuma chamada ao provedor IA deve ser realizada
```

---

#### CT-SEC-004: Headers de segurança HTTP

**Prioridade:** P2  
🔒

```gherkin
Dado que a aplicação está em produção (https://vvsaas.vercel.app)
Quando inspecionar os headers de resposta HTTP
Então os seguintes headers devem estar presentes:
  - Content-Security-Policy ou equivalente
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY ou SAMEORIGIN
  - Referrer-Policy
```

---

#### CT-SEC-005: CORS na API do provador

**Prioridade:** P1  
🔒

```gherkin
Dado que um site externo (evil.com) tenta fazer POST /api/try-on
Quando o browser enviar requisição cross-origin
Então o CORS deve bloquear a requisição de origens não permitidas
  E somente a própria origem da aplicação deve ser permitida
```

---

## RESUMO DE COBERTURA

### Por Módulo

| Módulo | Cenários | P0 | P1 | P2 | P3 |
|--------|----------|----|----|----|-----|
| Vitrine Pública | 14 (CT-VP-001 a 014) | 3 | 6 | 4 | 1 |
| Cabine Virtual / Try-On | 19 (CT-TRYON-001 a 019) | 7 | 6 | 5 | 1 |
| Dashboard Lojista | 6 (CT-LOJA-001 a 006) | 1 | 4 | 1 | 0 |
| Gestão de Peças | 14 (CT-PECA-001 a 014) | 5 | 6 | 3 | 0 |
| Configurações | 10 (CT-CONFIG-001 a 010) | 3 | 4 | 2 | 1 |
| Super Admin (extra) | 5 (CT-SA-016 a 020) | 2 | 2 | 1 | 0 |
| Acessibilidade | 9 (CT-A11Y-001 a 009) | 0 | 7 | 2 | 0 |
| Mobile | 5 (CT-MOB-001 a 005) | 0 | 4 | 1 | 0 |
| Segurança | 5 (CT-SEC-001 a 005) | 1 | 3 | 1 | 0 |
| **TOTAL** | **87** | **22** | **42** | **20** | **3** |

### Cenários já existentes (sessão 27/04/2026)

| Arquivo | Cenários |
|---------|----------|
| cenarios-autenticacao.md | 13 (CT-AUTH-001 a 013) |
| cenarios-super-admin.md | 15 (CT-SA-001 a 015) |
| **Subtotal existente** | **28** |

### Total geral

**87 novos + 28 existentes = 115 cenários BDD**

---

### Bugs identificados nesta sessão referenciados nos cenários

| Bug | Cenário(s) | Severidade |
|-----|-----------|------------|
| BUG-004 (callback 404) | CT-AUTH-010, CT-SA-008 | P0 |
| BUG-001 + BUG-002 (budget) | CT-SA-007 | P0 |
| BUG-003 (perPage:1) | CT-SA-009 | P0 |
| BUG-005 (sem rollback toggle) | CT-SA-005, CT-SA-006 | P1 |
| BUG-006 (badge hardcoded) | CT-SA-003 | P2 |
| BUG-007 (open redirect) | CT-AUTH-006 | P2 |
| **NOVO** — Turnstile bypass | CT-TRYON-016 | P0 (segurança) |

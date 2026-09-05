# Mapa de Módulos — padrão de arquitetura visual

Padrão para abrir qualquer projeto de produto: **uma página que mostra os produtos, seus módulos, todas as páginas de cada módulo e o status de cada uma**, com link direto para o arquivo já desenhado.

Serve como índice, plano de trabalho e contrato de nomenclatura ao mesmo tempo.

## Quando usar

- Ao começar um projeto com mais de um produto/subdomínio, ou mais de ~8 telas.
- Quando o cliente pergunta "como vamos organizar isso?".
- Antes de desenhar o segundo lote de telas — é o que evita arquivo solto sem dono.

## Como aplicar em outro projeto

1. Copie `Template - Mapa de Módulos.dc.html` para o projeto novo e renomeie para `Mapa de Módulos.dc.html`.
2. Copie este arquivo (`MAPA-DE-MODULOS.md`) junto, como referência.
3. No topo da classe de lógica, edite só os dados:
   - `THEME` — 6 valores de cor do design system do projeto.
   - `PRODUCTS` — um card por produto/subdomínio.
   - `MODULES` — os módulos do produto principal e suas páginas.
   - `SECONDARY` — módulos do produto interno/secundário (cards escuros).
   - `THIRD` — blocos do produto que roda fora deste projeto (cards tracejados).
   - `RULES` — as 3 regras de trabalho acordadas.
4. Aponte `logo` em `THEME` para o SVG da marca em `public/`.
5. Nada mais precisa ser mexido: contagens, status e links saem dos dados.

## Estrutura de dados

```js
// [nome, ícone, [[página, arquivo|null, status], ...]]
["Vendas", "cart", [
  ["Pedidos · lista", "App - Vendas - Pedidos.dc.html", "pronto"],
  ["Encaminhamentos", null, "plan"],
]]
```

Ícones disponíveis em `ICON`: grid, cart, factory, tag, wallet, megaphone, truck, users,
package, toolbox, clipboard, barchart, settings, building, card, gauge, life, shield, store, folder, send, sliders.

## Vocabulário de status (só três — não invente um quarto)

| status | significado | ponto |
| --- | --- | --- |
| `pronto` | desenhada e linkada | verde |
| `lote` | no lote em execução | âmbar |
| `plan` | planejada, sem desenho | cinza |

Se uma página está "meio pronta", ela é `lote`. Se ninguém decidiu que existe, ela não entra no mapa.

## Convenção de arquivo

```
<Produto> - <Módulo> - <Página>.dc.html
```

`App - Vendas - Pedidos.dc.html`, `Master - Assinantes - Detalhe.dc.html`.

Regras que sustentam a convenção:

- **Uma página por arquivo.** Alternativas de visão da mesma página (Kanban/lista, tabela/grade) são alternador dentro do arquivo, não arquivos novos.
- **Prefixo `Ref -`** para telas do estado atual mantidas como referência.
- **Prefixo `Design System -` / `Brand System -`** para os sistemas, que não são páginas do produto.
- **Um lote = um módulo inteiro** (desktop + mobile) antes de abrir o próximo.

## Regras visuais do mapa

- Três seções numeradas, uma por produto, sempre na mesma ordem (cliente → interno → público).
- Produto principal em cards claros; produto interno em cards escuros; produto de outro projeto em cards tracejados. A cor do card já diz de qual produto se trata.
- Grade de 3 colunas para os cards de módulo. Cada card: cabeçalho com ícone, nome e contagem, depois uma linha por página.
- Legenda sempre visível, com a convenção de arquivo ao lado.
- Faixa final "Como tratamos daqui pra frente" com 3 regras — é o que transforma o mapa em acordo de trabalho.
- Sem número inventado: toda contagem é derivada dos dados.

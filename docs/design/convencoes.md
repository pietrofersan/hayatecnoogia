# HAYA Intelligence — convenções do projeto de design

Painel de operação da Haya (repo `pietrofersan/hayatecnoogia`, Next.js App Router,
branch `claude/new-session-kgvti2`). Um único produto, três superfícies.

## Mapa de Módulos

`Mapa de Módulos.dc.html` é o índice e o plano de trabalho do projeto.
**Atualize o mapa na mesma leva em que criar, renomear ou concluir uma tela** —
editando só os blocos de dados no topo da lógica (`THEME`, `PRODUCTS`, `S1/S2/S3`,
`MODULES`, `SECONDARY`, `THIRD`, `RULES`). Contagens e links saem dos dados.
Receita do padrão em `MAPA-DE-MODULOS.md`.

Status: só `pronto` (desenhada e linkada), `lote` (no lote em execução) e
`plan` (planejada, sem desenho). Tela "meio pronta" é `lote`. Se ninguém decidiu
que a página existe, ela não entra no mapa.

## Convenção de nomes

```
Intelligence - <Módulo> - <Página>.dc.html
```

- **Uma página por arquivo.** Alternativas de visão da mesma página (Kanban/lista,
  tabela/grade, inbox/contatos/funil) são alternador dentro do arquivo, não arquivos novos.
- Cada página tem arquivo próprio. O arquivo é um mount fino do shell compartilhado
  `Intelligence - Protótipo navegável.dc.html` com `tela-inicial="<rota>"` —
  toda a lógica e os dados vivem no shell, então corrigir uma tela corrige em um lugar só.
- `Intelligence - Protótipo navegável.dc.html` continua sendo o shell e o passeio
  completo pelas 19 telas (desktop + mobile). Não é uma página do mapa.
- **`Ref -`** para telas do estado atual mantidas como referência
  (`Ref - Master - Dashboard.dc.html`, `Ref - Shell HUD - Exploração inicial.dc.html`).
- **`Design System -`** para os sistemas (`Design System - Intelligence.dc.html`) —
  não são páginas do produto.
- Sufixo ` - Claro` para o espelho no tema claro.

## Shells por superfície

| Superfície | Rotas | Shell |
| --- | --- | --- |
| Painel de operação | `app/(dash)/*` | sidebar 250 px fixa no desktop, nav inferior no mobile, header com título da tela e ações |
| Acesso | `app/login`, `app/sem-acesso` | sem sidebar e sem nav; card central sobre o fundo HUD |
| Coleta e integrações | `app/api/*` | sem interface — cron e webhooks; só aparecem na tela Integrações e coleta |

## Tema

Escuro é a versão canônica: fundo `#04060D` com halos radiais, painéis em vidro
`rgba(10,15,30,.62)` com borda `rgba(120,150,255,.14)`, tinta `#F2F7FF`, apoio `#9AA7CC`,
acentos `#4C6FFF` / `#22D3EE`, estados `#34E5B0` · `#F5A524` · `#F0338F`.
Tipografia: Space Grotesk (interface) + JetBrains Mono (rótulos, números, rotas).
O tema claro é espelho: mesma estrutura, só a paleta muda. **Nenhuma tela nova nasce
só no claro** — desenha no escuro e espelha depois.

## Idioma

Interface toda em português (pt-BR), inclusive rótulos de nav, badges e estados vazios.
Moeda em BRL (`formatBRL`, `lib/money.ts`). Nomes de rota em português minúsculo sem
acento, como o repo (`dominios`, `cobrancas`, `contatos`).

## Lotes

Um lote = um módulo inteiro (desktop + mobile) antes de abrir o próximo, sempre lendo o
código real do repo como fonte — não a memória dele. Handoff de implementação em
`design_handoff_haya_intelligence/`.

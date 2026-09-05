# Design — HAYA Intelligence

O que está aqui é a **fonte da verdade visual** do painel, vinda do pacote
`design_handoff_haya_intelligence`. O código em `app/` e `components/` deve ser
lido contra estes documentos, não contra o gosto de quem está mexendo.

| Arquivo | O que é |
| --- | --- |
| `handoff.md` | Tokens, as 19 telas, comportamento e estado necessário. Comece por aqui. |
| `convencoes.md` | Convenções do projeto de design: nomes, shells, tema, idioma. |
| `mapa-de-modulos.md` | Receita do índice de módulos do produto. |
| `tokens-referencia.css` | Os tokens em CSS puro, como vieram do pacote. |

## Onde os tokens vivem de verdade

`app/globals.css`, no bloco `@theme` do Tailwind 4. `tokens-referencia.css` é
cópia de conferência — **mudança de token acontece em `globals.css`**, e só
depois se atualiza a referência, se for o caso.

Tradução dos nomes, para quem vier do pacote:

| Pacote | Repo | Motivo |
| --- | --- | --- |
| `texto-base` | `corpo` | `text-base` colide com a escala tipográfica do Tailwind. |
| `texto-pleno`, `texto-suave`, … | `pleno`, `suave`, … | O prefixo `texto-` some; o utilitário já diz `text-`. |

## O que foi implementado

As 19 telas do handoff, menos três: **mapa de posicionamento**, **calendário de
publicação** e **conteúdo gerado**. As três dependem de tabelas que o schema
ainda não tem (grafo de páginas × palavras, agenda de publicação por canal,
peças geradas por IA) — ver `handoff.md` §4, §5 e §7 antes de começar qualquer
uma delas.

## Regras que não se negociam

- **Cor carrega estado.** Verde funcionando, âmbar aguardando, magenta falhou,
  ciano ação/IA, azul navegação, roxo contrato. Nunca decoração.
- **Todo número é mono.** JetBrains Mono em valor, código, timestamp, domínio e
  rótulo uppercase. Space Grotesk no resto.
- **Toda lista filtrável tem estado vazio com ação de saída.**
- **Escuro é o canônico.** O tema claro é espelho e ainda não foi implementado.

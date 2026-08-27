# Arquitetura Supabase — decisões

Registro de 27/08/2026. Levantado com dados reais via MCP.

## Estado atual

| Organização | Plano | Projetos |
|---|---|---|
| ALLINO (`qngrmsrvagiqsdhydsov`) | **pro** | PRINT.BE, ALLINO, omnicrm |
| HAYA (`hbsziygypvzdmbatroid`) | **free** | HAYA (vazio) |

## Decisão 1: uma organização por plano, não por marca

Organização no Supabase é fronteira de **cobrança**, não de dados. Planos não se
misturam dentro de uma organização — é por isso que projetos gratuitos exigem
uma organização separada da que está no Pro.

O nome da organização não tem efeito técnico nenhum.

### O limite gratuito é por conta, não por organização

> "You are granted two free projects. The project limit applies across all
> organizations where you are an Owner or Administrator."

Criar mais organizações **não multiplica** projetos gratuitos. São 2 no total,
somando tudo. Projetos pausados não contam para o limite.

### Projetos gratuitos pausam

Projeto no plano Free com pouca atividade em 7 dias é pausado
automaticamente. Restaurável por 90 dias; depois disso, só backup manual.
Projeto em plano pago nunca pausa.

Consequência: nada que fature, tenha cron ou cliente pagando pode ficar no
plano Free.

## Decisão 2: um projeto por produto — nunca um banco compartilhado

Projeto é um Postgres real, com um `auth.users` e um schema `public`.

Motivos para não juntar:

**Colisão de tabelas.** `profiles` existe em PRINT.BE, ALLINO e omnicrm.
`plans`, `tasks` e `platform_settings` existem em dois. Num `public`
compartilhado, se atropelam.

**Auth compartilhado quebra a RLS.** A policy do `0001_init.sql` é
`for all to authenticated using (true)`. Com auth único, um cliente final de
outro produto vira `authenticated` e passa a enxergar contratos e cobranças do
HAYA MASTER.

**Raio de explosão.** PRINT.BE tem 75 migrations e clientes reais. Migration
errada de um produto em desenvolvimento derrubaria o faturamento junto.

**Restore é do projeto inteiro.** Voltar um produto a ontem voltaria todos.

**Venda e separação societária.** Trativa e Obraverso podem ir para outro CNPJ.
Projeto separado sai numa transferência; extrair de banco compartilhado é
semanas de trabalho.

O HAYA MASTER é a camada comercial, com banco próprio, integrando os demais por
API e webhook — não por tabela compartilhada.

## Decisão 3: acesso por token pessoal, não OAuth

Detalhado em `mcp-supabase.md`. Resumo: o token pessoal enxerga a conta inteira,
independente de quantas organizações existam. O conector OAuth enxerga uma só.

Múltiplas organizações **não atrapalham** o Claude Code no Mac. Atrapalham
apenas as sessões da nuvem, que dependem do conector.

## Decisão 4: região — São Paulo, com a Vercel junto

Com usuários no Brasil, o melhor arranjo é **banco e funções da Vercel os dois
em São Paulo**.

| Arranjo | Navegador→Função | Função→Banco |
|---|---|---|
| Ambos nos EUA | ~120ms | ~5ms |
| **Ambos em São Paulo** | **~10ms** | **~5ms** |
| Função BR + banco US | ~10ms | ~120ms × N consultas |

O que importa não é a distância do banco ao usuário, e sim que função e banco
estejam juntos — e que o par esteja perto de quem usa. Dividir os dois é o pior
caso, porque o número de consultas multiplica a viagem.

Na Vercel, fixa-se em `vercel.json`:

```json
{ "regions": ["gru1"] }
```

Custo não muda: a Supabase cobra igual em qualquer região, e egress é
US$ 0,09/GB acima da cota em todas.

**Região é permanente.** Mudar exige criar projeto novo e migrar. Decidir antes
de carregar dado é barato; depois, não.


### Longo prazo: São Paulo não prende

Pesquisa na documentação (27/08/2026) não encontrou nenhuma feature com
restrição regional: Read Replicas, PITR, Custom Domains, Branching e Network
Restrictions aparecem sem ressalva. Preço é igual em todas as regiões.

Não há atraso de versão: omnicrm (`sa-east-1`) roda Postgres `17.6.1.165`,
enquanto PRINT.BE e ALLINO (EUA) rodam `17.6.1.155`.

**A saída para expansão internacional são Read Replicas**, não mudança de
região. Réplicas em outras regiões com geo-routing automático do balanceador;
o primário continua onde está.

Limitação: réplicas servem só leitura. Escrita e **Auth sempre vão ao
primário** — o que reforça São Paulo, já que login de usuário brasileiro
pagaria a viagem se o primário estivesse nos EUA.

Integrações também são brasileiras (Asaas, ZapSign): webhook e gravação ficam
no mesmo continente.

**Decisão: Trativa e Obraverso em `sa-east-1`.**

### Consequência para o omnicrm

`ghkckfamnpivlwlcjoez` está em `sa-east-1` — o único dos quatro na região certa.
Está vazio de dado real (1 workspace de teste, 5 pipeline_stages de seed) e já
tem o schema de CRM que o HAYA APP vai absorver.

Renomeá-lo para HAYA APP é o caminho certo, não um atalho.

### Pendência: PRINT.BE e ALLINO estão nos EUA

`us-east-1` e `us-east-2`, com dado real. Mover exige recriar e migrar. Não é
urgente e não é decisão desta rodada — mas fica registrado que estão pagando a
viagem ao exterior a cada requisição.

## Distribuição proposta

| Organização | Plano | Projetos | Critério |
|---|---|---|---|
| HAYA TECNOLOGIA | pro | Allino, Print.be, Haya App (ex-omnicrm, `sa-east-1`) | Fatura, tem cron, não pode pausar |
| HAYA 2 | free | Trativa, Obraverso | Em desenvolvimento, pausar é tolerável |

Cabe exatamente nos 2 gratuitos da conta — desde que o projeto `HAYA`
(`mpafjsfsxfvgjiofkfdx`), hoje ocupando um slot gratuito, vá para o Pro junto
com o HAYA MASTER.

Transferência entre organizações é livre e não muda região.

# HAYA Master — F1

Operação da agência: clientes, contratos com assinatura eletrônica, cobranças
recorrentes/parceladas/avulsas e inbox de leads dos sites dos clientes.

Implementa o [Blueprint Técnico F1 (v1)](docs/blueprint-f1.md).

## Stack

| Camada | Escolha |
| --- | --- |
| App | Next.js 15 (App Router) + TypeScript |
| Estilo | Tailwind v4 com os tokens Haya v1.1 (`app/globals.css`) |
| Banco / Auth / Storage | Supabase (Postgres + RLS, e-mail/senha, bucket `contratos`) |
| Cobranças | Asaas API v3 (sandbox) |
| Assinatura | ZapSign (sandbox) |
| Jobs | Vercel Cron (`vercel.json`) |

## Como rodar

```bash
cp .env.example .env.local     # preencha as chaves
npm install
npm run dev
```

### Projeto Supabase

Organização **HAYA TECNOLOGIA**, projeto **HAYA APP** (`ghkckfamnpivlwlcjoez`,
região `sa-east-1`). A migração `supabase/migrations/0001_init.sql` já está
aplicada lá.

```
NEXT_PUBLIC_SUPABASE_URL=https://ghkckfamnpivlwlcjoez.supabase.co
```

A anon key e a service_role saem de Settings → API do projeto. A service_role
ignora RLS: só em variável de servidor, nunca em `NEXT_PUBLIC_`.

O projeto foi reaproveitado de um app anterior (`omnicrm`) e as tabelas dele
— `profiles`, `workspaces`, `contacts`, `conversations`, `messages`,
`pipeline_stages`, `tags`, `channel_accounts` — agora são usadas pelo módulo
**CRM** deste repositório (ver [Estrutura](#estrutura)). Nenhuma colide com as
do Master; acesso é liberado a qualquer `usuarios_master` via
`public.is_master()` nas policies (`supabase/migrations/0002_crm_modulo.sql`).

Crie o primeiro usuário pelo painel Auth do Supabase — o login é por
e-mail/senha e todas as rotas fora de `/login`, `/api/leads`, `/api/webhooks`
e `/api/cron` passam pelo middleware de sessão.

## Estrutura

```
app/
├─ (dash)/dashboard · clientes · contratos · cobrancas · leads · config
├─ (dash)/crm/inbox · contatos · funil   # WhatsApp/IG/FB/Mercado Livre
├─ api/webhooks/asaas · zapsign
├─ api/leads/[siteKey]            # ingresso público dos formulários
└─ api/cron/vencimentos · resumo-semanal
lib/     asaas · zapsign · supabase · crm · money · pdf · acoes · consultas · notificacoes
components/  KpiTile · BarRow · StatusChip · FrenteTag · Tabela · WizardContrato · CrmSubNavLink…
supabase/migrations/0001_init.sql · 0002_crm_modulo.sql
scripts/import.ts + planilha-modelo.csv
```

**CRM.** Inbox unificado de conversas de WhatsApp/Instagram/Facebook/Mercado
Livre — hoje só a UI e o schema, lendo/escrevendo direto no Supabase; os
adaptadores de canal (que de fato conectam nas APIs externas) ainda não
existem, então as telas ficam vazias até o primeiro canal ser conectado. Um
único workspace serve todo o Master (`lib/crm.ts`); vira multi-tenant de
verdade só se/quando isso for vendido para outros clientes.

## Fluxos

**Contrato → cobrança.** Wizard em Contratos: cliente → template → valores →
gerar. O contrato nasce em `rascunho`. "Enviar para assinatura" renderiza o
template com as merge tags, gera o PDF, guarda no Storage e abre o documento na
ZapSign (`enviado`). O webhook `doc_signed` marca `assinado` e dispara a criação
da cobrança no Asaas conforme o modo — assinatura mensal, parcelamento ou
cobrança avulsa — deixando o contrato `ativo`.

**Cobranças.** Chegam pelos webhooks do Asaas, com idempotência pelo unique em
`cobrancas.asaas_payment_id`. Todo payload é gravado em `webhook_logs` antes do
processamento; falha de processamento fica registrada na linha do log, não
some. A 2ª via é o `invoiceUrl` do próprio Asaas.

**Leads.** `POST /api/leads/{site_key}` com honeypot, rate limit por IP e
consentimento LGPD obrigatório. A tabela tem RLS fechada — a escrita passa pela
rota com service role. O snippet pronto de cada site está em Config.

**Régua.** O Asaas já cobra por e-mail/SMS. O Master acrescenta o aviso interno
D+1 das vencidas (cron diário) e o resumo semanal (segundas).

## O que dá para operar hoje

- **Clientes** — cadastro, edição e ficha 360. Quando o espelho no Asaas falha
  no cadastro, a ficha mostra o botão para refazê-lo: sem `asaas_customer_id`
  o contrato assinado não vira cobrança.
- **Contratos** — wizard de criação, edição enquanto está em rascunho (depois
  de enviado o PDF já saiu da nossa mão), envio para assinatura e ativação da
  cobrança.
- **Sites** — cadastro e edição em Config, com o snippet do formulário de leads
  pronto para copiar. A `site_key` é gerada pelo banco e nunca muda: trocá-la
  derrubaria os formulários já instalados nos sites dos clientes.
- **Cobranças e leads** — listagem com filtros, 2ª via e marcação lido/respondido.

## Decisões tomadas na implementação

Pontos que o blueprint deixou em aberto e foram resolvidos aqui — vale revisar:

- **PDF por Gotenberg**, não `@react-pdf`: os modelos de contrato do Pietro
  chegam em HTML/DOCX e o `corpo_html` do template já é HTML. Sem
  `GOTENBERG_URL` configurada, o envio para assinatura falha com mensagem
  explícita em vez de gerar contrato vazio.
- **Aviso interno por Resend** (`RESEND_API_KEY`), com fallback para log —
  o blueprint pede o aviso mas não fecha o provedor. Trocar é um arquivo:
  `lib/notificacoes.ts`.
- **`sites.site_key`** foi acrescentada ao schema: a seção 5 pede chave por
  site e o modelo de dados original não tinha onde guardá-la.
- **Webhook ZapSign autenticado por `?t=`**, já que a ZapSign não assina o
  payload.
- **Ordem das tabelas na migração** corrigida (`templates_contrato` antes de
  `contratos`, que a referencia) e `seq` declarada antes da coluna gerada
  `codigo`.
- **RLS `authenticated only`** em todas as tabelas, como pedido — na F1 não há
  distinção admin/operador nas policies, só o campo `papel` em
  `usuarios_master` para quando a resposta sobre permissões chegar.
- **MRR** = soma das mensalidades dos contratos recorrentes ativos.
  **Receita por frente** e o gráfico de 6 meses usam cobranças pagas, pela data
  de pagamento.

## Migração dos clientes atuais

```bash
npm run import -- clientes.csv             # simulação
npm run import -- clientes.csv --aplicar   # grava e espelha no Asaas
```

Formato em `scripts/planilha-modelo.csv`. O script cria cliente + contrato e
espelha o cliente no Asaas **sem cobrança retroativa** — a primeira cobrança
pelo Master é a do ciclo seguinte; o mês corrente segue no fluxo antigo.

## Pendências de insumo

- [ ] Conta Asaas (sandbox + produção) e chave de API
- [ ] Conta ZapSign e token
- [ ] Modelos de contrato atuais (1 por tipo) para virarem templates
- [ ] Nº de clientes de mensalidade hoje · usuários e permissões
- [x] Projeto Supabase criado e schema aplicado (HAYA APP)
- [ ] Instância Gotenberg (ou decisão de trocar o gerador de PDF)

## Fora do escopo da F1

Monitor de sites (checagem de SSL/uptime) e o cockpit dos produtos aparecem
como placeholders no dashboard, conforme o mockup — a implementação é F2.

# HAYA MASTER — Blueprint Técnico F1 (v1)

> Documento de handoff para desenvolvimento no Claude Code.
> Decisões travadas: **Asaas** (cobranças) · **ZapSign** (assinatura eletrônica) · **Next.js + Supabase** · deploy **Vercel** (app) — F1 = operação da agência.
> Interface: estilo high tech / Power BI — mockup aprovado em https://claude.ai/code/artifact/90eb0894-91c9-4114-8fa8-50573bb0bd4b
> Tokens de cor: sistema Haya v1.1 (ver `cores`) — dashboard dark-first sobre `#0B0E15`.

---

## 1. Stack

- **Frontend/backend:** Next.js 15 (App Router) + TypeScript, Tailwind com os tokens Haya
- **Banco/Auth/Storage:** Supabase (Postgres + RLS, Auth por e-mail/senha + convites, Storage para PDFs de contrato)
- **Jobs/agendamentos:** Vercel Cron (régua de lembretes, verificação diária de vencimentos)
- **Integrações:** Asaas API v3 (sandbox → produção) · ZapSign API (sandbox) 
- **Observabilidade:** log de webhooks em tabela própria + Sentry (opcional F1)

## 2. Modelo de dados (Postgres/Supabase)

```sql
-- Frentes e catálogos ---------------------------------------------
create type frente as enum ('digital', 'tecnologia', 'visual', 'comunicacao');
create type modo_cobranca as enum ('recorrente', 'parcelado', 'avulso');
create type status_contrato as enum ('rascunho', 'enviado', 'assinado', 'ativo', 'suspenso', 'encerrado');
create type status_cobranca as enum ('pendente', 'paga', 'vencida', 'cancelada', 'estornada');

-- Núcleo -----------------------------------------------------------
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,                     -- razão social ou nome
  nome_fantasia text,
  documento text,                         -- CPF/CNPJ (validar dígitos no app)
  email text, telefone text, whatsapp text,
  asaas_customer_id text unique,          -- espelho no Asaas
  observacoes text,
  criado_em timestamptz default now()
);

create table contratos (
  id uuid primary key default gen_random_uuid(),
  codigo text generated always as ('C-' || lpad(seq::text, 4, '0')) stored,
  seq serial,
  cliente_id uuid not null references clientes(id),
  frente frente not null,
  tipo text not null,                     -- catálogo extensível: website, hospedagem, marketing_mensal, trafego, dev_sistema, manutencao, sinalizacao, projeto_pontual...
  descricao text,
  modo modo_cobranca not null,
  valor_centavos bigint not null,         -- recorrente: mensalidade; parcelado/avulso: total
  parcelas int,                           -- só p/ modo parcelado
  dia_vencimento int check (dia_vencimento between 1 and 28),
  indice_reajuste text default 'IPCA',
  inicio date, fim date,
  status status_contrato not null default 'rascunho',
  -- assinatura eletrônica
  template_id uuid references templates_contrato(id),
  zapsign_doc_id text, zapsign_status text,
  pdf_path text,                          -- Supabase Storage
  criado_em timestamptz default now()
);

create table templates_contrato (
  id uuid primary key default gen_random_uuid(),
  nome text not null,                     -- 1 por tipo (Pietro envia os modelos)
  frente frente, tipo text,
  corpo_html text not null,               -- com merge tags {{cliente.nome}}, {{valor}}, {{vigencia}}...
  ativo boolean default true
);

create table assinaturas (                -- espelho da recorrência no Asaas
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id),
  asaas_subscription_id text unique,
  ciclo text default 'MONTHLY',
  proxima_cobranca date,
  ativa boolean default true
);

create table cobrancas (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id),
  assinatura_id uuid references assinaturas(id),
  asaas_payment_id text unique,
  valor_centavos bigint not null,
  vencimento date not null,
  pago_em timestamptz,
  forma text,                             -- PIX | BOLETO | CREDIT_CARD
  status status_cobranca not null default 'pendente',
  url_fatura text,                        -- invoiceUrl do Asaas
  parcela int, total_parcelas int
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),   -- dono do site que captou
  site text,                                  -- domínio de origem
  nome text, email text, telefone text,
  mensagem text,
  origem jsonb,                               -- utm_*, página, form id
  consentimento boolean default false,        -- LGPD: checkbox do form
  criado_em timestamptz default now(),
  lido boolean default false
);

create table sites (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  dominio text not null,
  host text,                                  -- locaweb | hostinger | vercel | outro
  ssl_expira date, dominio_expira date,       -- preenchido por job diário (F2: checks automáticos)
  uptime_ok boolean, checado_em timestamptz
);

create table webhook_logs (
  id bigint generated always as identity primary key,
  origem text not null,                       -- asaas | zapsign | leadform
  evento text, payload jsonb,
  processado boolean default false, erro text,
  recebido_em timestamptz default now()
);

create table usuarios_master (                -- perfis sobre auth.users
  id uuid primary key references auth.users(id),
  nome text, papel text default 'admin'       -- admin | operador (F1: só admin se resposta 8 = só sócios)
);
```

**RLS:** todas as tabelas com policy `authenticated only`; leads têm endpoint público de INSERT via edge function com chave por site (nunca RLS aberta).

## 3. Integração Asaas (F1)

Fluxos:
1. **Cliente → Asaas:** ao criar cliente, `POST /v3/customers` → salvar `asaas_customer_id`.
2. **Contrato recorrente:** ao ativar, `POST /v3/subscriptions` (ciclo mensal, `billingType: UNDEFINED` deixa o cliente escolher PIX/boleto/cartão) → salvar `asaas_subscription_id`; cobranças chegam via webhook.
3. **Contrato parcelado:** `POST /v3/payments` com `installmentCount` → parcelas registradas em `cobrancas`.
4. **Avulso:** `POST /v3/payments` simples.
5. **Webhooks** (`/api/webhooks/asaas`, validar token do header): `PAYMENT_CREATED`, `PAYMENT_CONFIRMED/RECEIVED` → status `paga`; `PAYMENT_OVERDUE` → `vencida` (+ notificação interna); `PAYMENT_DELETED/REFUNDED`. Tudo logado em `webhook_logs` antes de processar (idempotência por `asaas_payment_id`).
6. **Régua:** o Asaas já envia e-mail/SMS de cobrança; o Master acrescenta aviso interno D+1 de vencida e resumo semanal.

Sandbox: `https://api-sandbox.asaas.com/` — desenvolver 100% no sandbox; chave em `ASAAS_API_KEY` (env).

## 4. Integração ZapSign (F1)

1. Gerar PDF do contrato: render do `corpo_html` do template com merge tags → PDF (lib `@react-pdf` ou Gotenberg) → Storage.
2. `POST /api/v1/docs/` (ZapSign) com o PDF + signatário (nome, e-mail/WhatsApp do cliente) → salvar `zapsign_doc_id`.
3. Webhook ZapSign (`/api/webhooks/zapsign`): `doc_signed` → contrato `assinado` → **gatilho**: se modo recorrente, criar assinatura no Asaas automaticamente (o fluxo do mockup: Gerado → Enviado → Assinado → Cobrança ativa).

## 5. Leads (F1)

- Endpoint público: `POST /api/leads/{site_key}` (edge function; rate limit; honeypot anti-spam).
- Snippet padrão pros sites (form HTML ou fetch) + campo de consentimento LGPD obrigatório.
- Inbox no Master com filtro por cliente + marcação lido/respondido; notificação (e-mail/WhatsApp interno) a cada lead novo.

## 6. Telas F1 (conforme mockup)

1. **Dashboard** — KPIs grandes (MRR, ativos, a receber, inadimplência, leads 30d), receita por frente, receita 6 meses, cobranças por status, últimas cobranças, leads recentes, monitor de sites (placeholder F1), strip do cockpit (skeleton F1).
2. **Clientes** — lista + ficha 360 (contratos, cobranças, leads, sites do cliente).
3. **Contratos** — tabela com filtros por frente/tipo/modo/assinatura + drawer de detalhe com timeline (mockup) + wizard "Novo contrato" (cliente → template → valores → gerar → enviar ZapSign).
4. **Cobranças** — lista com status/forma/vencimento + ações (2ª via = `url_fatura`).
5. **Leads** — inbox.
6. **Config** — templates de contrato, chaves de API, usuários.

## 7. Estrutura do repo

```
haya-master/
├─ app/
│  ├─ (dash)/dashboard | clientes | contratos | cobrancas | leads | config/
│  ├─ api/webhooks/asaas/route.ts · zapsign/route.ts
│  └─ api/leads/[siteKey]/route.ts
├─ lib/ (asaas.ts · zapsign.ts · supabase.ts · money.ts)
├─ components/ (ui do design system Haya: KpiTile, BarRow, StatusChip, FrenteTag...)
├─ supabase/migrations/0001_init.sql  (o schema acima)
└─ .env.example  (ASAAS_API_KEY, ZAPSIGN_TOKEN, SUPABASE_*, LEAD_NOTIFY_EMAIL)
```

## 8. Tokens de interface (do estudo de cores v1.1)

```css
--noite:#0B0E15; --painel:#10141F; --linha:#1B2130; --marfim:#F5F0E4;
--ink-2:#B9BECB; --nevoa:#8D93A5; --apagado:#5A6072;
--tec:#5B82FF; --dig:#ED2D69; --vis:#26A583;             /* categóricas validadas (ordem fixa: dig→tec→vis) */
--ok:#2FA36B; --alerta:#BC8A00; --critico:#DE4B55;        /* status: sempre com rótulo+ícone, nunca só cor */
--ouro:#D9A441;                                           /* exclusivo de momentos da marca-mãe */
```
Regras de gráfico (validadas): barras finas com ponta 4px arredondada só no lado do dado; gap de 2px entre segmentos; rótulos diretos seletivos; texto sempre em tons de tinta (nunca na cor da série); série única sem legenda; tooltips em todos os gráficos no produto real.

## 9. Migração dos clientes atuais

1. Planilha modelo (cliente, contrato, valor, dia de vencimento, forma atual) → Pietro preenche.
2. Script de import (`scripts/import.ts`) cria clientes + contratos + espelha no Asaas SEM disparar cobrança retroativa.
3. Primeira cobrança pelo Master no ciclo seguinte; mês corrente permanece no fluxo antigo.

## 10. Pendências de insumo (Pietro)

- [ ] Conta Asaas (sandbox + produção) e chave de API
- [ ] Conta ZapSign e token
- [ ] Modelos de contrato atuais (1 por tipo) para virarem templates
- [ ] Respostas: nº de clientes de mensalidade hoje · usuários/permissões
- [ ] OK para criar o projeto Supabase (posso criar direto da sessão Cowork — MCP conectado)

*Preparado pela HAYA Tecnologia · agosto/2026 · v1 — dúvidas da F2 (cockpit, APIs dos produtos, Locaweb/Hostinger) seguem no documento de escopo.*

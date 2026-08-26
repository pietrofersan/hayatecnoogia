-- HAYA MASTER · F1 — schema inicial
-- Blueprint Técnico F1 (v1) · seção 2

create extension if not exists pgcrypto;

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
  email text,
  telefone text,
  whatsapp text,
  asaas_customer_id text unique,          -- espelho no Asaas
  observacoes text,
  criado_em timestamptz not null default now()
);

create table templates_contrato (
  id uuid primary key default gen_random_uuid(),
  nome text not null,                     -- 1 por tipo (Pietro envia os modelos)
  frente frente,
  tipo text,
  corpo_html text not null,               -- merge tags {{cliente.nome}}, {{valor}}, {{vigencia}}...
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table contratos (
  id uuid primary key default gen_random_uuid(),
  seq serial,
  codigo text generated always as ('C-' || lpad(seq::text, 4, '0')) stored,
  cliente_id uuid not null references clientes(id) on delete restrict,
  frente frente not null,
  tipo text not null,                     -- catálogo extensível: website, hospedagem, marketing_mensal,
                                          -- trafego, dev_sistema, manutencao, sinalizacao, projeto_pontual...
  descricao text,
  modo modo_cobranca not null,
  valor_centavos bigint not null check (valor_centavos > 0),
  parcelas int check (parcelas is null or parcelas > 1),   -- só p/ modo parcelado
  dia_vencimento int check (dia_vencimento between 1 and 28),
  indice_reajuste text default 'IPCA',
  inicio date,
  fim date,
  status status_contrato not null default 'rascunho',
  -- assinatura eletrônica
  template_id uuid references templates_contrato(id),
  zapsign_doc_id text,
  zapsign_status text,
  pdf_path text,                          -- Supabase Storage
  criado_em timestamptz not null default now(),
  constraint parcelas_so_em_parcelado check (modo <> 'parcelado' or parcelas is not null),
  constraint vigencia_coerente check (fim is null or inicio is null or fim >= inicio)
);

create index contratos_cliente_idx on contratos (cliente_id);
create index contratos_status_idx on contratos (status);
create index contratos_frente_idx on contratos (frente);

create table assinaturas (                -- espelho da recorrência no Asaas
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id) on delete cascade,
  asaas_subscription_id text unique,
  ciclo text not null default 'MONTHLY',
  proxima_cobranca date,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

create index assinaturas_contrato_idx on assinaturas (contrato_id);

create table cobrancas (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id) on delete cascade,
  assinatura_id uuid references assinaturas(id) on delete set null,
  asaas_payment_id text unique,
  valor_centavos bigint not null,
  vencimento date not null,
  pago_em timestamptz,
  forma text,                             -- PIX | BOLETO | CREDIT_CARD | UNDEFINED
  status status_cobranca not null default 'pendente',
  url_fatura text,                        -- invoiceUrl do Asaas
  parcela int,
  total_parcelas int,
  criado_em timestamptz not null default now()
);

create index cobrancas_contrato_idx on cobrancas (contrato_id);
create index cobrancas_status_venc_idx on cobrancas (status, vencimento);

create table sites (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete set null,
  dominio text not null,
  site_key text not null unique default encode(gen_random_bytes(16), 'hex'), -- chave pública do form de leads
  host text,                              -- locaweb | hostinger | vercel | outro
  ssl_expira date,
  dominio_expira date,                    -- preenchido por job diário (F2: checks automáticos)
  uptime_ok boolean,
  checado_em timestamptz,
  criado_em timestamptz not null default now()
);

create index sites_cliente_idx on sites (cliente_id);

create table leads (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete set null,  -- dono do site que captou
  site_id uuid references sites(id) on delete set null,
  site text,                              -- domínio de origem
  nome text,
  email text,
  telefone text,
  mensagem text,
  origem jsonb,                           -- utm_*, página, form id
  consentimento boolean not null default false,   -- LGPD: checkbox do form
  criado_em timestamptz not null default now(),
  lido boolean not null default false,
  respondido boolean not null default false
);

create index leads_cliente_idx on leads (cliente_id);
create index leads_criado_idx on leads (criado_em desc);

create table webhook_logs (
  id bigint generated always as identity primary key,
  origem text not null,                   -- asaas | zapsign | leadform
  evento text,
  payload jsonb,
  processado boolean not null default false,
  erro text,
  recebido_em timestamptz not null default now()
);

create index webhook_logs_recebido_idx on webhook_logs (recebido_em desc);

create table usuarios_master (            -- perfis sobre auth.users
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  papel text not null default 'admin',    -- admin | operador
  criado_em timestamptz not null default now()
);

-- RLS ---------------------------------------------------------------
-- Todas as tabelas: acesso apenas para usuários autenticados do Master.
-- O ingresso público de leads acontece pela rota /api/leads/[siteKey],
-- que usa a service role no servidor — nunca uma policy aberta.
alter table clientes            enable row level security;
alter table templates_contrato  enable row level security;
alter table contratos           enable row level security;
alter table assinaturas         enable row level security;
alter table cobrancas           enable row level security;
alter table sites               enable row level security;
alter table leads               enable row level security;
alter table webhook_logs        enable row level security;
alter table usuarios_master     enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'clientes','templates_contrato','contratos','assinaturas',
    'cobrancas','sites','leads','webhook_logs','usuarios_master'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_authenticated', t
    );
  end loop;
end $$;

-- Storage: bucket privado dos PDFs de contrato
insert into storage.buckets (id, name, public)
values ('contratos', 'contratos', false)
on conflict (id) do nothing;

create policy "contratos_storage_authenticated"
  on storage.objects for all to authenticated
  using (bucket_id = 'contratos')
  with check (bucket_id = 'contratos');

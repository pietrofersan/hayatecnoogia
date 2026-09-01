-- HAYA Master — módulo CRM (WhatsApp/Instagram/Facebook/Mercado Livre)
--
-- Este schema nasceu no app CRM separado ("omnicrm", depois "haya-app"),
-- que foi desligado — os repositórios e os deploys dele não existem mais.
-- Este arquivo é a **única cópia** daquele modelo de dados: traz o schema
-- original inteiro (tipos, tabelas, índices, funções, triggers e RLS) mais
-- os dois ajustes que o Master precisa:
--
-- 1. Segurança: revoga os privilégios de tabela que o projeto concede por
--    padrão ao papel `anon` (incluindo TRUNCATE, que ignora RLS). Alinha
--    com a postura do resto do banco: "anon não recebe nada".
-- 2. Acesso: qualquer membro do Master (public.is_master()) enxerga o
--    workspace único do CRM, sem precisar de linha própria em
--    workspace_members — o middleware já garante que só quem está em
--    usuarios_master chega nessas rotas. O `private.is_workspace_member()`
--    continua no lugar para o dia em que o CRM virar multi-tenant de fato.
--
-- Tudo é idempotente: as tabelas já existem neste banco desde o app antigo,
-- e a migration precisa rodar limpa tanto aqui quanto num banco vazio.

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

do $$
begin
  create type public.workspace_role as enum ('admin', 'agent');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.channel_kind as enum (
    'whatsapp_qr', 'whatsapp_cloud', 'instagram', 'facebook', 'mercado_livre'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.channel_account_status as enum ('connected', 'disconnected', 'pending');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.conversation_status as enum ('open', 'pending', 'closed');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.message_direction as enum ('inbound', 'outbound');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.message_sender as enum ('contact', 'agent', 'system');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.message_status as enum ('pending', 'sent', 'delivered', 'read', 'failed');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Funções internas (só trigger e RLS chamam — ficam fora do schema exposto
-- pela API, com search_path fixo)
-- ---------------------------------------------------------------------------

create or replace function private.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id and user_id = (select auth.uid())
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: espelha auth.users com os dados públicos do agente
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

-- ---------------------------------------------------------------------------
-- workspaces + membros: hoje só existe 1, mas tudo já é isolado por
-- workspace_id — multi-tenant real não exige remodelar o banco
-- ---------------------------------------------------------------------------

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'agent',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_idx on public.workspace_members (user_id);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

-- ---------------------------------------------------------------------------
-- channel_accounts: uma conta conectada de um canal dentro do workspace
-- ---------------------------------------------------------------------------

create table if not exists public.channel_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel public.channel_kind not null,
  external_id text not null,          -- número, @handle, page id, seller id...
  display_name text,
  status public.channel_account_status not null default 'pending',
  credentials jsonb not null default '{}'::jsonb,  -- tokens/sessão do adaptador
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, channel, external_id)
);

create index if not exists channel_accounts_workspace_idx on public.channel_accounts (workspace_id);

alter table public.channel_accounts enable row level security;

create or replace trigger channel_accounts_set_updated_at
  before update on public.channel_accounts
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- contacts: identidade do cliente final, por canal
-- ---------------------------------------------------------------------------

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel public.channel_kind not null,
  external_id text not null,          -- telefone, @handle, comprador ML...
  name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  unique (workspace_id, channel, external_id)
);

create index if not exists contacts_workspace_idx on public.contacts (workspace_id);

alter table public.contacts enable row level security;

-- ---------------------------------------------------------------------------
-- pipeline_stages: estágios do funil, editáveis por workspace
-- ---------------------------------------------------------------------------

create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  color text not null default '#5b6660',
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists pipeline_stages_workspace_idx on public.pipeline_stages (workspace_id);

alter table public.pipeline_stages enable row level security;

-- ---------------------------------------------------------------------------
-- tags: livres, por workspace
-- ---------------------------------------------------------------------------

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  color text not null default '#5b6660',
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

alter table public.tags enable row level security;

-- ---------------------------------------------------------------------------
-- conversations: thread por contato + canal
-- ---------------------------------------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  channel_account_id uuid not null references public.channel_accounts (id) on delete cascade,
  status public.conversation_status not null default 'open',
  assigned_to uuid references auth.users (id) on delete set null,
  pipeline_stage_id uuid references public.pipeline_stages (id) on delete set null,
  last_message_at timestamptz,
  window_expires_at timestamptz,      -- janela de 24h do WhatsApp (null = n/a)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_workspace_idx on public.conversations (workspace_id);
create index if not exists conversations_contact_idx on public.conversations (contact_id);
create index if not exists conversations_assigned_idx on public.conversations (assigned_to);
create index if not exists conversations_channel_account_idx on public.conversations (channel_account_id);
create index if not exists conversations_pipeline_stage_idx on public.conversations (pipeline_stage_id);
create index if not exists conversations_last_message_idx
  on public.conversations (workspace_id, last_message_at desc);

alter table public.conversations enable row level security;

create or replace trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- conversation_tags: liga conversa <-> tags (n:n)
-- ---------------------------------------------------------------------------

create table if not exists public.conversation_tags (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (conversation_id, tag_id)
);

create index if not exists conversation_tags_tag_idx on public.conversation_tags (tag_id);

alter table public.conversation_tags enable row level security;

-- ---------------------------------------------------------------------------
-- messages: texto/mídia normalizados, com o id de origem para idempotência
-- ---------------------------------------------------------------------------

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  direction public.message_direction not null,
  sender_type public.message_sender not null,
  sender_id uuid references auth.users (id) on delete set null,
  body text,
  media_url text,
  external_message_id text,           -- id da mensagem no canal de origem
  status public.message_status not null default 'sent',
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists messages_sender_idx on public.messages (sender_id);
create unique index if not exists messages_external_id_idx
  on public.messages (workspace_id, external_message_id)
  where external_message_id is not null;

alter table public.messages enable row level security;

-- ---------------------------------------------------------------------------
-- 1. Segurança: anon não recebe nada nas tabelas do CRM
-- ---------------------------------------------------------------------------

revoke all on
  public.profiles, public.workspaces, public.workspace_members,
  public.channel_accounts, public.contacts, public.pipeline_stages,
  public.tags, public.conversations, public.conversation_tags,
  public.messages
from anon;

-- ---------------------------------------------------------------------------
-- 2. Acesso: membros do Master enxergam o workspace único do CRM, além de
--    quem já é workspace_member
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using ((select auth.uid()) = id or public.is_master());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using ((select auth.uid()) = id);

drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member"
  on public.workspaces for select
  using (private.is_workspace_member(id) or public.is_master());

drop policy if exists "workspace_members_select_same_workspace" on public.workspace_members;
create policy "workspace_members_select_same_workspace"
  on public.workspace_members for select
  using (private.is_workspace_member(workspace_id) or public.is_master());

drop policy if exists "channel_accounts_all_member" on public.channel_accounts;
create policy "channel_accounts_all_member"
  on public.channel_accounts for all
  using (private.is_workspace_member(workspace_id) or public.is_master())
  with check (private.is_workspace_member(workspace_id) or public.is_master());

drop policy if exists "contacts_all_member" on public.contacts;
create policy "contacts_all_member"
  on public.contacts for all
  using (private.is_workspace_member(workspace_id) or public.is_master())
  with check (private.is_workspace_member(workspace_id) or public.is_master());

drop policy if exists "pipeline_stages_all_member" on public.pipeline_stages;
create policy "pipeline_stages_all_member"
  on public.pipeline_stages for all
  using (private.is_workspace_member(workspace_id) or public.is_master())
  with check (private.is_workspace_member(workspace_id) or public.is_master());

drop policy if exists "tags_all_member" on public.tags;
create policy "tags_all_member"
  on public.tags for all
  using (private.is_workspace_member(workspace_id) or public.is_master())
  with check (private.is_workspace_member(workspace_id) or public.is_master());

drop policy if exists "conversations_all_member" on public.conversations;
create policy "conversations_all_member"
  on public.conversations for all
  using (private.is_workspace_member(workspace_id) or public.is_master())
  with check (private.is_workspace_member(workspace_id) or public.is_master());

drop policy if exists "conversation_tags_all_member" on public.conversation_tags;
create policy "conversation_tags_all_member"
  on public.conversation_tags for all
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (private.is_workspace_member(c.workspace_id) or public.is_master())
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (private.is_workspace_member(c.workspace_id) or public.is_master())
    )
  );

drop policy if exists "messages_all_member" on public.messages;
create policy "messages_all_member"
  on public.messages for all
  using (private.is_workspace_member(workspace_id) or public.is_master())
  with check (private.is_workspace_member(workspace_id) or public.is_master());

-- ---------------------------------------------------------------------------
-- Seed: workspace único do CRM (o id é fixo, e o código conta com isso —
-- lib/crm.ts) + estágios de funil de partida, editáveis depois
-- ---------------------------------------------------------------------------

insert into public.workspaces (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Principal')
on conflict (id) do nothing;

insert into public.pipeline_stages (workspace_id, name, color, sort_order)
select '00000000-0000-0000-0000-000000000001', v.name, v.color, v.sort_order
from (values
  ('Novo', '#b8481a', 1::smallint),
  ('Em atendimento', '#c98a2c', 2),
  ('Qualificação', '#2f6f63', 3),
  ('Proposta', '#3c5580', 4),
  ('Fechado', '#4b7a3d', 5)
) as v (name, color, sort_order)
where not exists (
  select 1 from public.pipeline_stages
  where workspace_id = '00000000-0000-0000-0000-000000000001'
    and name = v.name
);

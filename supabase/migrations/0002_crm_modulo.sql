-- HAYA Master — módulo CRM (WhatsApp/Instagram/Facebook/Mercado Livre)
--
-- As tabelas abaixo já existem fisicamente neste banco (vieram de um
-- app anterior, "omnicrm") — esta migration documenta o schema no
-- histórico deste repositório (idempotente, `if not exists`) e aplica
-- dois ajustes para o módulo funcionar como parte do Master:
--
-- 1. Segurança: revoga os privilégios de tabela que o projeto concede
--    por padrão ao papel `anon` (incluindo TRUNCATE, que ignora RLS).
--    Alinha com a postura do resto do banco: "anon não recebe nada".
-- 2. Acesso: qualquer membro do Master (public.is_master()) passa a
--    enxergar os dados do workspace único do CRM, sem precisar de uma
--    linha própria em workspace_members — o middleware já garante que
--    só quem está em usuarios_master chega nessas rotas.

-- ---------------------------------------------------------------------------
-- Schema (idempotente — já existe, documentado aqui pra ficar no histórico)
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'agent',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.channel_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel text not null,
  external_id text not null,
  display_name text,
  status text not null default 'pending',
  credentials jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, channel, external_id)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel text not null,
  external_id text not null,
  name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  unique (workspace_id, channel, external_id)
);

create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  color text not null default '#5b6660',
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  color text not null default '#5b6660',
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  channel_account_id uuid not null references public.channel_accounts (id) on delete cascade,
  status text not null default 'open',
  assigned_to uuid references auth.users (id) on delete set null,
  pipeline_stage_id uuid references public.pipeline_stages (id) on delete set null,
  last_message_at timestamptz,
  window_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_tags (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (conversation_id, tag_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  direction text not null,
  sender_type text not null,
  sender_id uuid references auth.users (id) on delete set null,
  body text,
  media_url text,
  external_message_id text,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);

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
-- 2. Acesso: membros do Master enxergam o workspace único do CRM,
--    além de quem já é workspace_member (mantém compatível com um
--    futuro multi-tenant real, se voltar a fazer sentido)
-- ---------------------------------------------------------------------------

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

drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member"
  on public.workspaces for select
  using (private.is_workspace_member(id) or public.is_master());

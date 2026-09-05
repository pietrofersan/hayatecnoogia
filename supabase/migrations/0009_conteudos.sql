-- Conteúdo gerado e calendário de publicação (HAYA Intelligence §5 e §7)
-- --------------------------------------------------------------------
-- Uma tabela só serve as duas telas: "Conteúdo gerado" é a lista por
-- status, "Calendário de publicação" é a mesma coisa fatiada por semana
-- de `publicar_em`. A fila de aprovação das duas telas é a mesma linha
-- com status 'aguardando' — fonte única de verdade, como manda o handoff
-- ("Aprovar/devolver muda o status em toda a aplicação").
--
-- Nenhum post sai sem aprovação humana: quem gera (IA) só chega em
-- 'aguardando'; 'aprovado' exige um usuário, registrado em aprovado_por.

create type public.canal_conteudo as enum (
  'instagram', 'facebook', 'tiktok', 'blog', 'youtube'
);

create type public.status_conteudo as enum (
  'rascunho', 'aguardando', 'aprovado', 'publicado'
);

create table public.conteudos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes (id) on delete set null,
  canal public.canal_conteudo not null,
  titulo text not null,
  trecho text,
  corpo text,
  status public.status_conteudo not null default 'rascunho',
  -- Agenda: é isto que o calendário lê. Nulo = peça sem data marcada,
  -- aparece só na tela de conteúdo gerado.
  publicar_em timestamptz,
  publicado_em timestamptz,
  -- Rastro de custo: qual modelo gerou e quanto custou aquela peça.
  modelo text,
  custo_centesimos_usd int not null default 0,
  criado_em timestamptz not null default now(),
  aprovado_em timestamptz,
  aprovado_por uuid references auth.users (id) on delete set null
);

create index conteudos_publicar_idx on public.conteudos (publicar_em);
create index conteudos_status_idx on public.conteudos (status, criado_em desc);
create index conteudos_cliente_idx on public.conteudos (cliente_id);

alter table public.conteudos enable row level security;

create policy "conteudos_master" on public.conteudos
  for all using (public.is_master()) with check (public.is_master());

grant select, insert, update, delete on public.conteudos to authenticated;

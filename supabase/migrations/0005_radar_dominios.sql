-- Módulo 2 — Radar de domínios (compilado geral, Parte 3.7/3.12)
--
-- Segmentos checa domínio sob demanda, uma vez. O radar é o outro lado:
-- uma lista de domínios que a HAYA quer acompanhar no tempo — o que está
-- livre e pode ser registrado, e o que está ocupado mas tem data de
-- expiração conhecida. Um cron diário reconsulta por RDAP (grátis, sem
-- chave) e registra cada mudança de estado; virar "livre" dispara aviso
-- interno.

create type public.estado_dominio as enum ('livre', 'registrado', 'indeterminado');

create table public.dominios_radar (
  id uuid primary key default gen_random_uuid(),
  dominio text not null unique,
  motivo text,
  cliente_id uuid references public.clientes (id) on delete set null,
  palavra_id uuid references public.palavras_chave (id) on delete set null,
  estado public.estado_dominio not null default 'indeterminado',
  expira_em timestamptz,
  registrado_em timestamptz,
  registrador text,
  checado_em timestamptz,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index dominios_radar_ativo_idx on public.dominios_radar (ativo, checado_em);
create index dominios_radar_cliente_idx on public.dominios_radar (cliente_id);
create index dominios_radar_palavra_idx on public.dominios_radar (palavra_id);

-- Histórico: só mudança de estado entra, não toda checagem — o radar roda
-- todo dia e o que interessa é "mudou", não "continua igual".
create table public.eventos_dominio (
  id bigint generated always as identity primary key,
  dominio_id uuid not null references public.dominios_radar (id) on delete cascade,
  de public.estado_dominio,
  para public.estado_dominio not null,
  em timestamptz not null default now()
);

create index eventos_dominio_dominio_idx on public.eventos_dominio (dominio_id, em desc);

alter table public.dominios_radar enable row level security;
alter table public.eventos_dominio enable row level security;

create policy "dominios_radar_master" on public.dominios_radar
  for all using (public.is_master()) with check (public.is_master());

create policy "eventos_dominio_master" on public.eventos_dominio
  for all using (public.is_master()) with check (public.is_master());

grant select, insert, update, delete on public.dominios_radar to authenticated;
grant select, insert on public.eventos_dominio to authenticated;
grant usage, select on sequence public.eventos_dominio_id_seq to authenticated;

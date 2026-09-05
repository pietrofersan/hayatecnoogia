-- Mapa de posicionamento (HAYA Intelligence §4)
-- --------------------------------------------------------------------
-- Grafo por cliente: o hub é o domínio principal da marca, e em volta
-- ficam subdomínios, landings, marcas satélite, canibalizações (duas
-- páginas brigando pela mesma palavra) e buracos (palavra que ninguém
-- cobre ainda).
--
-- A posição (x, y) é guardada porque o desenho é curado à mão — não é
-- layout automático de grafo; o canvas do handoff é 900×560.

create type public.tipo_no_mapa as enum (
  'hub', 'subdominio', 'landing', 'satelite', 'canibalizacao', 'buraco'
);

create table public.mapa_nos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  tipo public.tipo_no_mapa not null,
  rotulo text not null,
  palavra_alvo text,
  escopo text,
  url text,
  telefone text,
  trafego_mes int,
  leads_30d int,
  x real not null default 450,
  y real not null default 280,
  criado_em timestamptz not null default now()
);

create index mapa_nos_cliente_idx on public.mapa_nos (cliente_id);

create table public.mapa_arestas (
  id bigint generated always as identity primary key,
  de uuid not null references public.mapa_nos (id) on delete cascade,
  para uuid not null references public.mapa_nos (id) on delete cascade,
  -- Aresta de canibalização é a linha magenta tracejada do handoff.
  canibalizacao boolean not null default false,
  unique (de, para)
);

create index mapa_arestas_de_idx on public.mapa_arestas (de);
create index mapa_arestas_para_idx on public.mapa_arestas (para);

alter table public.mapa_nos enable row level security;
alter table public.mapa_arestas enable row level security;

create policy "mapa_nos_master" on public.mapa_nos
  for all using (public.is_master()) with check (public.is_master());

create policy "mapa_arestas_master" on public.mapa_arestas
  for all using (public.is_master()) with check (public.is_master());

grant select, insert, update, delete on public.mapa_nos to authenticated;
grant select, insert, update, delete on public.mapa_arestas to authenticated;
grant usage, select on sequence public.mapa_arestas_id_seq to authenticated;

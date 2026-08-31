-- HAYA MASTER · Módulo 1 — Inteligência de mercado (Compilado geral, Parte 1 e 16)
--
-- Dois modos (Parte 2): SEGMENTO livre (cliente_id nulo, prospecção) e
-- PROJETO/CLIENTE (cliente_id preenchido — quando um segmento vira cliente,
-- o estudo já feito vai junto, por isso é o mesmo registro, não uma cópia).
--
-- tendência/volume ficam nulos até Keyword Planner e Trends saírem da fila
-- de aprovação (Parte 3.2 e 3.5) — a tela mostra "aguardando" nesse caso,
-- nunca inventa número. A checagem de domínio usa RDAP, que não exige
-- chave nem aprovação (Parte 3.7/3.12).

create type public.tendencia_palavra as enum ('subindo', 'estavel', 'caindo');

create table segmentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cliente_id uuid references clientes(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index segmentos_cliente_idx on segmentos (cliente_id);

create table palavras_chave (
  id uuid primary key default gen_random_uuid(),
  segmento_id uuid not null references segmentos(id) on delete cascade,
  termo text not null,
  tendencia tendencia_palavra,          -- null: aguardando Trends/Ads
  volume int,                           -- null: aguardando Keyword Planner
  interessante boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (segmento_id, termo)
);

create index palavras_chave_segmento_idx on palavras_chave (segmento_id);

create table checagens_dominio (
  id bigint generated always as identity primary key,
  palavra_id uuid not null references palavras_chave(id) on delete cascade,
  extensao text not null,               -- com, com.br, net, ...
  disponivel boolean,                   -- null: ainda não checado
  checado_em timestamptz,
  unique (palavra_id, extensao)
);

create index checagens_dominio_palavra_idx on checagens_dominio (palavra_id);

-- RLS: mesmo padrão do restante do Master — só quem está em usuarios_master.
alter table segmentos          enable row level security;
alter table palavras_chave     enable row level security;
alter table checagens_dominio  enable row level security;

create policy segmentos_master
  on segmentos for all to authenticated
  using (public.is_master()) with check (public.is_master());

create policy palavras_chave_master
  on palavras_chave for all to authenticated
  using (public.is_master()) with check (public.is_master());

create policy checagens_dominio_master
  on checagens_dominio for all to authenticated
  using (public.is_master()) with check (public.is_master());

grant select, insert, update, delete on segmentos, palavras_chave, checagens_dominio to authenticated;
grant usage, select on all sequences in schema public to authenticated;

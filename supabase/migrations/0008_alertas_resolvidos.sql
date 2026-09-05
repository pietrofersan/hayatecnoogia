-- Central de alertas (HAYA Intelligence §10)
-- --------------------------------------------------------------------
-- Os alertas não são armazenados: eles são derivados a cada carga de
-- domínios, cobranças, contratos, leads e webhooks. O que precisa
-- persistir é só a baixa — quem resolveu o quê e quando — para o item
-- sumir da lista e do dashboard sem apagar o dado de origem.
--
-- A chave é determinística e vem do próprio gerador do alerta
-- (ex.: 'cobranca:vencida:<uuid>'), então reabrir a mesma condição
-- depois de resolvida exige um alerta com chave nova.

create table public.alertas_resolvidos (
  chave text primary key,
  resolvido_em timestamptz not null default now(),
  resolvido_por uuid references auth.users (id) on delete set null
);

create index alertas_resolvidos_em_idx on public.alertas_resolvidos (resolvido_em desc);

alter table public.alertas_resolvidos enable row level security;

-- Mesma regra do resto do Master: só a equipe cadastrada em usuarios_master.
create policy "alertas_resolvidos_master" on public.alertas_resolvidos
  for all using (public.is_master()) with check (public.is_master());

grant select, insert, delete on public.alertas_resolvidos to authenticated;

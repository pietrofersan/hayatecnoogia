-- Adaptador de WhatsApp (QR Code, via Baileys) — armazenamento da sessão.
--
-- A credencial do Baileys equivale a estar logado no WhatsApp Web daquele
-- número: quem lê essas linhas consegue ler e mandar mensagem como se fosse
-- a HAYA. Guarda no banco (em vez de disco do servidor) só porque o Render
-- pode recriar a máquina a qualquer redeploy — sem isso, cada deploy pediria
-- escanear o QR de novo.
--
-- Sem policy nenhuma de propósito: só o service role (que ignora RLS) lê e
-- escreve aqui. Nem authenticated, nem is_master() — ninguém da equipe
-- precisa ver isso pela UI, e o Master nunca deveria conseguir.

create table public.whatsapp_sessoes (
  canal_id uuid not null references public.channel_accounts (id) on delete cascade,
  chave text not null,
  valor jsonb not null,
  atualizado_em timestamptz not null default now(),
  primary key (canal_id, chave)
);

alter table public.whatsapp_sessoes enable row level security;
revoke all on public.whatsapp_sessoes from anon, authenticated;

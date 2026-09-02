-- Etiqueta do WhatsApp Business tem id próprio, que não é o nome — o nome
-- pode mudar sem trocar o id. Sem essa coluna não dá pra sincronizar de
-- forma idempotente (só por nome duplicaria a cada rename).

alter table public.tags add column if not exists external_id text;

create unique index if not exists tags_workspace_external_idx
  on public.tags (workspace_id, external_id)
  where external_id is not null;

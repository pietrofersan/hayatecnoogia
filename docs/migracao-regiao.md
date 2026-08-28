# Migração de ALLINO e PRINT.BE para São Paulo

Levantado em 27/08/2026 via MCP. Região é imutável: migrar significa criar
projeto novo em `sa-east-1` e transferir conteúdo.

## Tamanho real

| | ALLINO | PRINT.BE |
|---|---|---|
| Ref atual | `hhfsaxkisrkhttxkgclt` | `iktqvinbdcmqysgqslew` |
| Região atual | us-east-2 | us-east-1 |
| Tabelas | 32 | 45 |
| Linhas (total) | ~100 | ~450 |
| **auth.users** | **2** | **1** |
| Arquivos no Storage | 2 | 2 |
| Edge Functions | — | **nenhuma** |
| pg_cron | não | **1 job** |
| Migrations | 7 | 75 |

São bancos pequenos. O risco não é volume — é a virada: chaves, cron e
Storage, que **não vêm no dump**.

Dois fatos que reduzem muito o risco:

- **Nenhuma Edge Function no PRINT.BE.** Nenhum webhook externo aponta para a
  URL do Supabase; tudo passa pelo app na Vercel, cujo domínio não muda.
- **1 e 2 usuários de Auth.** A questão do JWT secret é irrelevante: é mais
  simples relogar do que reaproveitar segredo.

## Pré-requisitos, no Mac

O CLI da Supabase roda `pg_dump` dentro de um container, então:

- Docker Desktop instalado e **rodando**
- Supabase CLI (`npx supabase` serve)
- `psql` instalado

Isto **não roda em sessão da nuvem**: `supabase.com` está bloqueado pela
política de rede do ambiente, e não há Docker.

## Ordem

**ALLINO primeiro.** Dois usuários, app de uso pessoal, nada fatura. É o ensaio
de baixo risco para você ver o processo funcionar antes de encostar no PRINT.BE,
que tem cliente pagando.

## Procedimento, por projeto

### 1. Criar o projeto novo

Mesma organização, região **South America (São Paulo)**, Postgres padrão.
Marcar `Enable automatic RLS`; a exposição automática pode ficar como estava,
já que o schema vem pronto do dump.

Guardar a senha do banco.

### 2. Pegar as duas connection strings

Painel → **Connect** → *Session pooler* — no projeto antigo e no novo.

### 3. Dump — três arquivos

```bash
export ANTIGO="postgresql://...projeto-antigo..."

supabase db dump --db-url "$ANTIGO" -f roles.sql  --role-only
supabase db dump --db-url "$ANTIGO" -f schema.sql
supabase db dump --db-url "$ANTIGO" -f data.sql   --use-copy --data-only
```

`supabase db dump` filtra schemas internos e remove roles reservadas. `pg_dump`
puro inclui internals da Supabase e falha no restore por permissão.

### 4. Restore

```bash
export NOVO="postgresql://...projeto-novo..."

psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "$NOVO"
```

`session_replication_role = replica` desliga triggers durante a carga, evitando
efeitos colaterais como dupla criptografia de coluna.

O `auth` inteiro vem junto — usuários e senhas com hash preservados.

### 5. O que o dump NÃO leva

**Storage.** São 2 arquivos em cada projeto: baixar do painel antigo e subir no
novo, mantendo bucket e caminho.

- ALLINO: `master-interface` (2)
- PRINT.BE: `customer-art` (1), `product-images` (1)

Criar também os buckets vazios: `task-attachments` no ALLINO;
`master-interface`, `payment-receipts` no PRINT.BE.

**pg_cron — só no PRINT.BE.** O schema `cron` é interno e fica de fora. Recriar
no SQL Editor do projeto novo:

```sql
create extension if not exists pg_cron;

select cron.schedule(
  'close-billing-periods',
  '0 3 * * *',
  $$ -- corpo do job, copiar de cron.job no projeto antigo $$
);
```

Antes de migrar, pegar o corpo exato:

```sql
select jobname, schedule, command from cron.job;
```

### 6. Vercel

Trocar as variáveis de ambiente para as do projeto novo — URL, anon key e
service role key. As chaves **mudam**: são derivadas do ref do projeto.

E fixar a região das funções, senão o banco em São Paulo piora as coisas:

```json
{ "regions": ["gru1"] }
```

Redeploy.

### 7. Conferir antes de desligar

```sql
select schemaname, relname, n_live_tup
from pg_stat_user_tables order by n_live_tup desc;

select count(*) from auth.users;
```

Comparar com os números da tabela no topo deste documento.

### 8. Pausar, não deletar

Deixar o projeto antigo **pausado** por algumas semanas. Pausado não conta para
o limite de projetos gratuitos e é restaurável por 90 dias. Deletar só depois
que o novo estiver rodando sem susto.

## Janela

Com bancos deste tamanho, o dump e o restore levam minutos. A janela de
indisponibilidade é o intervalo entre parar de escrever no antigo e o redeploy
da Vercel apontando para o novo — na prática, algo entre 15 e 30 minutos.

Para o PRINT.BE, escolher horário de baixo movimento. O cron roda às 3h.

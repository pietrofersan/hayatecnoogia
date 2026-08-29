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


## O que o `supabase db dump` NÃO leva — verificado na prática

Levantado migrando o ALLINO em 28/08/2026. O dump cobre o schema `public`
por completo, mas três coisas ficam de fora e **nenhuma delas dá erro**:
o restore passa limpo e a falta só aparece em uso.

**1. Triggers no schema `auth`.** O `on_auth_user_created`, que dispara
`handle_new_user()` a cada cadastro, não veio. Sem ele o usuário é criado sem
perfil, sem espaço, sem prioridades e sem assinatura.

**2. Buckets e policies de Storage.** O schema `storage` fica fora inteiro —
nem os buckets, nem as policies de `storage.objects`.

**3. REVOKEs desfeitos por GRANT.** Este é o mais traiçoeiro. O dump termina com
`GRANT ALL ON FUNCTIONS TO anon, authenticated` e `ALTER DEFAULT PRIVILEGES`,
que **reconcedem privilégios que migrations anteriores tinham revogado**.

No ALLINO isso reabriu `find_user_id_by_email` para o papel `anon` — função
`SECURITY DEFINER` que recebe e-mail e, sem login, permitiria descobrir se um
endereço está cadastrado.


**4. Configuração de Auth.** Provedores sociais (Google, Apple) e URLs. O
projeto novo nasce com `Site URL` em `http://localhost:3000`, então o login
social completa o handshake e devolve o usuário para o lugar errado.

Copiar do projeto antigo em Authentication → Sign In / Providers e
Authentication → URL Configuration. E **adicionar a nova callback URL no
console do provedor** (Google Cloud → Credenciais → URIs de redirecionamento):
o endereço contém o ref do projeto e muda.

**5. Dados de referência.** Não é lacuna do dump — é de interpretação. "Dado
fictício" e "dado de referência" moram nas mesmas tabelas.

No ALLINO, `plans` vazia quebrou todo cadastro novo: o trigger
`handle_new_user()` insere em `subscriptions` com `plan_id='gratuito'` e a
chave estrangeira falhava. O painel só dizia "Database error creating new
user". Também faltavam `platform_settings` e `master_financial_categories`.

Antes de migrar, listar quais tabelas são catálogo e copiar o conteúdo delas.

## ALLINO — concluído

- Schema, policies, índices, triggers, Storage e dados de referência: conferidos
- Usuários recriados com `is_admin` e plano corretos; Google vinculado à mesma
  conta (`email, google`), sem duplicata
- Vercel apontando para `lcctergaissacxecokrd`, confirmado pelos logs de auth
- `vercel.json` com `"regions": ["gru1"]` — a API da Vercel confirma
  `regions: ["gru1"]` no deploy de produção. **O plano Hobby aceita fixar uma
  região**; só múltiplas regiões é recurso Pro.

Pendente: deletar `hhfsaxkisrkhttxkgclt` após um ou dois dias de uso. Em
organização Pro não há pausa — ou paga, ou deleta.


**6. Trigger de auto-seed faz o seed explicito duplicar.** Nao e lacuna do
dump — e do seed. Se o schema tem trigger que popula tabela sozinho, inserir a
mesma coisa no seed duplica em vez de ser ignorado, porque `on conflict do
nothing` so pega quando existe restricao de unicidade.

No PRINT.BE, `stores_seed_financial_categories` dispara ao inserir loja e cria
9 categorias por loja. O seed inseriu de novo: 36 em vez de 18. Nada acusou
erro — so apareceu na conferencia de numeros.

Antes de escrever seed, listar os triggers de INSERT das tabelas envolvidas:

```sql
select c.relname, t.tgname, pg_get_triggerdef(t.oid)
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where not t.tgisinternal and n.nspname='public'
  and pg_get_triggerdef(t.oid) ilike '%insert%';
```

## PRINT.BE — concluído

Origem `iktqvinbdcmqysgqslew` (us-east-1) → destino **`vsiawlvbsgbjbkhkwwgo`**
(sa-east-1).

| | Antigo | Novo |
|---|---|---|
| Tabelas | 45 | 45 |
| Policies (public) | 71 | 71 |
| Policies (storage) | 9 | 9 |
| Buckets | 4 | 4 |
| Índices | 103 | 103 |
| Funções | 27 | 27 |
| Triggers | 13 | 13 |
| Job de pg_cron | 1 | 1 |

**Regressão de privilégio, maior que a do ALLINO.** Os `GRANT ALL ON FUNCTIONS`
do fim do dump reabriram **12 funções** para o papel `anon` — de 15 para 27. A
maioria era função de gatilho, que nunca deveria ser endpoint REST; entre as
demais, `find_user_id_by_email` (enumeração de e-mail sem login),
`public_order_line_floor` (sondagem da tabela de preços) e
`seed_financial_categories`. Restaurado para 15 em `anon` e 16 em
`authenticated`, listas idênticas à origem.

Dois agendamentos coexistem e ambos foram preservados: `close-billing-periods`
no pg_cron às 3h, e `/api/cron/faturamento` no `vercel.json` às 6h.

`vercel.json` com `"regions": ["gru1"]` — commit `7f529c9` na `main`.

Pendente: deletar `iktqvinbdcmqysgqslew` após um ou dois dias de uso.

### Por isso a verificação obrigatória

Rodar `get_advisors` nos dois projetos e **comparar lista com lista**. Diferença
é regressão até prova em contrário. Contagem de tabelas batendo não prova nada
sobre privilégio.

Comparar também:

```sql
select count(*) from information_schema.tables where table_schema='public';
select count(*) from pg_policies where schemaname='public';
select count(*) from pg_policies where schemaname='storage';
select count(*) from storage.buckets;
select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
  join pg_namespace n on n.oid=c.relnamespace
  where not t.tgisinternal and n.nspname in ('public','auth');
```

## ALLINO — estado da migração

Destino: **ALLINO SP** (`lcctergaissacxecokrd`), `sa-east-1`.

| | Antigo | Novo |
|---|---|---|
| Tabelas | 32 | 32 |
| Policies (public) | 89 | 89 |
| Policies (storage) | 5 | 5 |
| Buckets | 2 | 2 |
| Índices | 75 | 75 |
| Funções | 4 | 4 |
| Tipos enum | 5 | 5 |
| Triggers | 3 | 3 |
| Avisos de segurança | 3 + senha vazada desligada | 3 |

Schema completo. Falta: recriar os 2 usuários de Auth, trocar variáveis na
Vercel e validar o app.

## Janela

Com bancos deste tamanho, o dump e o restore levam minutos. A janela de
indisponibilidade é o intervalo entre parar de escrever no antigo e o redeploy
da Vercel apontando para o novo — na prática, algo entre 15 e 30 minutos.

Para o PRINT.BE, escolher horário de baixo movimento. O cron roda às 3h.

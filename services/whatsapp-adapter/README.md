# HAYA WhatsApp Adapter

Conexão com o WhatsApp por QR Code (via [Baileys](https://github.com/WhiskeySockets/Baileys), o
protocolo do WhatsApp Web) — sem custo por mensagem, sem depender da janela de 24h da Cloud API
da Meta. Roda como processo persistente separado do Master (que é serverless na Vercel e não
consegue manter essa conexão viva).

Espelha direto nas tabelas que o módulo CRM do Master já lê (`supabase/migrations/0002_crm_modulo.sql`
na raiz do repo) — contatos, conversas, mensagens e etiquetas (`tags`/`conversation_tags`). Nenhum
schema novo pro CRM em si; só a tabela `whatsapp_sessoes`
(`supabase/migrations/0006_whatsapp_sessoes.sql`), que guarda a credencial da sessão — sem ela, cada
redeploy pediria escanear o QR de novo.

## Escopo desta primeira versão

- Mensagens de texto, nos dois sentidos (grupo fica de fora por enquanto).
- Nome do contato, sincronizado na primeira mensagem.
- Etiquetas de conversa do WhatsApp Business — viram `tags` no CRM.
- Reconexão automática; só para de tentar em logout explícito (aí precisa de QR novo).

Fora do escopo por ora: mídia (baixar imagem/áudio/documento), grupos, listas de transmissão e
respostas rápidas — ficam pro próximo passo, quando o formato delas estiver definido.

## Rodando local

```bash
npm install
cp .env.example .env   # preencha
npm run build && npm start
# ou, pra iterar:
npm run dev             # outro terminal: node dist/index.js
```

Abra `http://localhost:3000/qr`, escaneie com **Aparelhos conectados** no WhatsApp.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `SUPABASE_URL` | sim | mesmo projeto do Master — `https://ghkckfamnpivlwlcjoez.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | **secreta** — ignora RLS. Nunca comitar, nunca colar em chat. |
| `CRM_WORKSPACE_ID` | não | default `00000000-0000-0000-0000-000000000001` (o mesmo de `lib/crm.ts`) |
| `CANAL_EXTERNAL_ID` | não | default `principal` — precisa existir uma linha em `channel_accounts` com esse id antes de subir |
| `PORT` | não | default `3000` |

## Deploy (Render)

Build: `cd services/whatsapp-adapter && npm install && npm run build`
Start: `cd services/whatsapp-adapter && npm start`

O serviço é um **web service** (precisa da porta pública pro `/qr`), não um background worker —
mas o que importa de verdade é o processo ficar vivo; o HTTP é só a tela de pareamento.

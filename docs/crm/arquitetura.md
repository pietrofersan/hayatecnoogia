> Escrito originalmente para o app CRM separado (`pietrofersan/haya-app`), que ficou parado — hoje é referência para o módulo `app/(dash)/crm` deste repositório.

# Arquitetura

## Visão geral

O OmniCRM tem duas camadas, propositalmente desacopladas:

1. **Motor de mensageria (próprio)** — serviço que integra diretamente com
   cada canal (WhatsApp, Instagram, Facebook Messenger, Mercado Livre):
   recebe webhooks, normaliza a mensagem num modelo único de conversa,
   gerencia token/sessão de cada canal, envia mensagens de saída.
2. **CRM** — Next.js + Supabase. Interface e regra de negócio que o
   cliente final usa: funil de vendas, pipeline, automações, relatórios.

O motor de mensageria roda como serviço próprio (adaptador por canal),
alimentando o mesmo inbox unificado do CRM via banco de dados
compartilhado (Supabase/Postgres) e/ou fila de eventos — a UI nunca fala
direto com a API de cada rede social, sempre passa pelo nosso modelo
único.

```
Canais externos              Motor de mensageria (nosso)         CRM (nosso)
┌───────────────┐            ┌─────────────────────────┐        ┌──────────┐
│ WhatsApp       │──webhook──▶│ adaptador WhatsApp        │        │           │
│ Instagram      │──webhook──▶│ adaptador Instagram       │──────▶│ inbox     │
│ Facebook       │──webhook──▶│ adaptador Facebook        │  msg  │ funil     │
│ Mercado Livre  │──webhook──▶│ adaptador Mercado Livre   │ único │ automações│
└───────────────┘            └─────────────────────────┘        └──────────┘
```

Cada adaptador é responsável por:
- Validar/receber webhooks do canal.
- Normalizar a mensagem (texto, mídia, áudio) para o modelo único.
- Gerenciar token/sessão (refresh de OAuth2, reconexão de sessão QR).
- Enviar mensagens de saída na API nativa do canal.

## Canais

| Canal | Como conectamos | Observação |
|---|---|---|
| WhatsApp | Adaptador próprio — Cloud API oficial (Meta) para produção; conector QR (Baileys) como opção rápida para MVP/demo | QR Code tem risco de banimento — não usar com clientes pagantes em produção |
| Instagram | Adaptador próprio — Instagram Messaging API (Meta Graph API) | Requer app revisado pela Meta |
| Facebook Messenger | Adaptador próprio — Messenger Platform (Meta Graph API) | Requer app revisado pela Meta |
| Mercado Livre | Adaptador próprio — API de Perguntas e Mensagens Pós-Venda | OAuth2 por conta de vendedor conectada; webhooks via Notifications API |

Detalhes de cada canal em [CANAIS.md](CANAIS.md).

## Modelo único de conversa

Todo adaptador escreve no mesmo formato, independente do canal de
origem — é isso que permite um inbox unificado no CRM:

- `contact` — identidade do cliente final (telefone, @handle, usuário ML),
  vinculada a um `channel_account` (qual canal e qual conta nossa recebeu).
- `conversation` — thread por contato+canal.
- `message` — texto/mídia normalizados, com referência à mensagem
  original do canal (para idempotência de webhook).

## Multi-tenant (revenda)

Cada cliente que assina o OmniCRM precisa:

- Conectar os canais dele (WhatsApp, IG, FB) via fluxo de autorização —
  para WhatsApp/IG/FB em escala, isso exige que a OmniCRM vire um
  **Tech Provider / Solution Partner da Meta**, usando o fluxo de
  "embedded signup" para cada cliente autorizar sua própria conta, sem
  depender de nenhuma plataforma terceira de inbox.
- Autorizar sua conta do Mercado Livre via OAuth2 própria (um
  `access_token`/`refresh_token` por loja conectada).

Esse cadastro como Tech Provider da Meta é o processo mais demorado
(revisão de negócio, semanas) e vale iniciar cedo, em paralelo ao
desenvolvimento — é exigido independente da arquitetura de mensageria
escolhida.

## Infraestrutura (estimativa inicial)

- Motor de mensageria: serviço Node.js próprio (adaptadores + fila de
  processamento de webhook), com processo persistente para as sessões
  WhatsApp via QR (Baileys mantém conexão longa-duração por número).
- CRM (Next.js): hospedagem serverless (ex: Vercel) + Supabase.
- Custo por conversa do WhatsApp acima da cota gratuita da Meta (quando
  migrado para Cloud API).

> Escrito originalmente para o app CRM separado (`pietrofersan/haya-app`), que ficou parado — hoje é referência para o módulo `app/(dash)/crm` deste repositório.

# Canais — detalhes de integração

Cada canal vira um **adaptador próprio** (ver ARQUITETURA.md), responsável
por normalizar mensagens para o modelo único de conversa.

## WhatsApp

**Opção A — Não-oficial (QR Code)**
- Bibliotecas: Baileys (a mais usada/mantida) ou WPPConnect.
- Funciona escaneando o QR Code com o número, igual WhatsApp Web — nosso
  serviço mantém a sessão conectada.
- Prós: setup em minutos, sem aprovação da Meta, sem custo por conversa.
- Contras: viola os Termos de Uso do WhatsApp, risco de banimento do
  número, sem SLA — não recomendado para clientes pagantes em produção.
- Uso recomendado: MVP/demo interna, enquanto o cadastro de Tech Provider
  na Meta está em andamento.
- Implementação: serviço Node.js dedicado (processo de longa duração por
  sessão conectada), publicando mensagens recebidas no modelo único de
  conversa e expondo endpoint para envio.

**Opção B — Cloud API oficial (Meta)**
- Requer conta Business verificada + app revisado pela Meta.
- Integração via webhook (mensagens recebidas) + REST API (envio).
- Custo por conversa acima da cota gratuita (~1.000 conversas/mês
  iniciadas pelo cliente).
- Uso recomendado: produção, especialmente multi-cliente — sem risco de
  banimento, com SLA da Meta.

## Instagram / Facebook Messenger

- Via Meta Graph API (Instagram Messaging API + Messenger Platform).
- Integração via webhook (mensagem recebida) + REST API (envio) — mesmo
  padrão do WhatsApp Cloud API.
- Requer app revisado pela Meta (App Review).
- Gratuito.

## Mercado Livre

- API pública: `api.mercadolibre.com`.
- Autenticação: OAuth2 — cada vendedor autoriza nossa aplicação.
- Endpoints relevantes:
  - Perguntas e Respostas (pré-venda, nos anúncios).
  - Mensagens pós-venda (`/messages`), vinculadas a `order_id`/`pack_id`.
- Webhooks via Notifications API (pergunta nova, mensagem nova, mudança de
  status de pedido).
- Gratuito (só limite de rate).

## Meta Tech Provider / Solution Partner

Para revender WhatsApp/Instagram/Facebook a múltiplos clientes (multi-
tenant), é necessário:
- Cadastro como Tech Provider / Solution Partner na Meta.
- Fluxo de "embedded signup" para cada cliente conectar a própria conta.
- Processo de revisão que pode levar semanas — iniciar cedo, em paralelo
  ao desenvolvimento do adaptador.

## Padrão comum dos adaptadores oficiais (Meta)

WhatsApp Cloud API, Instagram e Messenger seguem o mesmo formato de
integração:
1. Endpoint de webhook público (verificado por token na Meta).
2. Recebe evento → normaliza para o modelo único de conversa.
3. Envio de mensagem via REST API com o token da conta conectada.
4. Refresh de token de longa duração conforme expiração.

Isso permite reaproveitar boa parte do código entre os três adaptadores.

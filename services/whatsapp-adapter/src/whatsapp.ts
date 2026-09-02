import makeWASocket, { Browsers, DisconnectReason, fetchLatestBaileysVersion } from 'baileys'
import type { WASocket } from 'baileys'
import { Boom } from '@hapi/boom'
import QRCode from 'qrcode'
import { apagarSessao, usarAuthStateSupabase } from './authState.js'
import { logger } from './logger.js'
import { iniciarOutbox } from './outbox.js'
import { sincronizarAssociacaoEtiqueta, sincronizarEtiqueta } from './labels.js'
import { registrarMensagemRecebida } from './sync.js'
import { supabase } from './supabase.js'

let qrAtual: string | null = null
let estadoAtual: 'pending' | 'connected' | 'disconnected' = 'pending'
let pararOutbox: (() => void) | null = null

export function getQrAtual() {
  return qrAtual
}

export function getEstadoAtual() {
  return estadoAtual
}

async function atualizarCanal(canalId: string, campos: Record<string, unknown>) {
  await supabase.from('channel_accounts').update(campos).eq('id', canalId)
}

/**
 * Conecta ao WhatsApp e fica reconectando sozinho enquanto a sessão for
 * válida — só para de verdade em logout explícito (QR trocado no
 * aparelho, ou "sair" pelo WhatsApp). Qualquer outro motivo de queda
 * (rede, servidor reiniciado) é considerado transitório.
 */
export async function conectar(canalId: string): Promise<void> {
  const { state, saveCreds } = await usarAuthStateSupabase(canalId)

  const versao = await fetchLatestBaileysVersion().catch(() => null)

  const sock: WASocket = makeWASocket({
    auth: state,
    logger,
    browser: Browsers.ubuntu('HAYA CRM'),
    ...(versao ? { version: versao.version } : {}),
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, qr, lastDisconnect } = update

    if (qr) {
      qrAtual = qr
      estadoAtual = 'pending'
      await atualizarCanal(canalId, { status: 'pending' })
      // Direto no log — não depende de porta nenhuma exposta. Num VPS sem
      // domínio ainda, é `journalctl -u whatsapp-adapter -f` e pronto.
      const ascii = await QRCode.toString(qr, { type: 'terminal', small: true })
      logger.info('novo QR gerado — escaneie com o WhatsApp (Aparelhos conectados)')
      // eslint-disable-next-line no-console
      console.log(ascii)
    }

    if (connection === 'open') {
      qrAtual = null
      estadoAtual = 'connected'
      const numero = sock.user?.id ? `+${sock.user.id.split(':')[0].split('@')[0]}` : null
      await atualizarCanal(canalId, {
        status: 'connected',
        display_name: sock.user?.name ?? sock.user?.notify ?? numero,
      })
      logger.info({ numero }, 'WhatsApp conectado')
      if (!pararOutbox) pararOutbox = iniciarOutbox(sock, canalId, logger)
    }

    if (connection === 'close') {
      estadoAtual = 'disconnected'
      const motivo = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode
      const deslogado = motivo === DisconnectReason.loggedOut

      await atualizarCanal(canalId, { status: 'disconnected' })
      pararOutbox?.()
      pararOutbox = null

      if (deslogado) {
        logger.warn('sessão encerrada pelo WhatsApp (logout) — apagando credenciais, precisa de novo QR')
        await apagarSessao(canalId)
        qrAtual = null
      }

      logger.warn({ motivo, deslogado }, 'conexão caiu, tentando de novo em 5s')
      setTimeout(() => conectar(canalId), 5_000)
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      if (msg.key.fromMe) continue
      try {
        await registrarMensagemRecebida(canalId, msg, logger)
      } catch (err) {
        logger.error({ err, msgId: msg.key.id }, 'falhou ao processar mensagem recebida')
      }
    }
  })

  sock.ev.on('labels.edit', (label) => {
    sincronizarEtiqueta(label).catch((err) => logger.error({ err }, 'falhou ao sincronizar etiqueta'))
  })

  sock.ev.on('labels.association', ({ association, type }) => {
    sincronizarAssociacaoEtiqueta(association, type, canalId, logger).catch((err) =>
      logger.error({ err }, 'falhou ao sincronizar associação de etiqueta'),
    )
  })
}

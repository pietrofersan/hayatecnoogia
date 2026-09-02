import express from 'express'
import QRCode from 'qrcode'
import { getEstadoAtual, getQrAtual } from './whatsapp.js'
import { env } from './env.js'
import { logger } from './logger.js'

export function iniciarServidor(): void {
  const app = express()

  app.get('/health', (_req, res) => {
    res.json({ estado: getEstadoAtual() })
  })

  app.get('/qr.png', async (_req, res) => {
    const qr = getQrAtual()
    if (!qr) {
      res.status(404).send('Sem QR no momento — ou já conectado, ou aguardando gerar.')
      return
    }
    res.type('png')
    res.send(await QRCode.toBuffer(qr, { width: 400, margin: 2 }))
  })

  // Página simples que se atualiza sozinha até conectar — não precisa de nada
  // no Master pra isso, é só pra você escanear uma vez.
  app.get('/qr', (_req, res) => {
    const estado = getEstadoAtual()
    if (estado === 'connected') {
      res.send('<h1>WhatsApp conectado ✓</h1><p>Pode fechar esta página.</p>')
      return
    }
    res.send(`
      <html>
        <head><meta http-equiv="refresh" content="5"></head>
        <body style="font-family: sans-serif; text-align: center; padding: 2rem;">
          <h1>Escaneie com o WhatsApp</h1>
          <p>Aparelho → Configurações → Aparelhos conectados → Conectar um aparelho</p>
          <img src="/qr.png?t=${Date.now()}" style="max-width: 320px;" onerror="this.style.display='none'" />
          <p style="color: #888">Atualiza sozinho a cada 5s até você escanear.</p>
        </body>
      </html>
    `)
  })

  const porta = env.porta()
  app.listen(porta, () => logger.info({ porta }, 'servidor do QR no ar'))
}

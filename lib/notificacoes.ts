/**
 * Avisos internos da agência (régua da seção 3.6 e alerta de lead novo).
 *
 * O blueprint não fecha o provedor de e-mail; a implementação usa Resend
 * quando RESEND_API_KEY está configurada e, sem ela, apenas registra —
 * assim o cron nunca quebra por falta de integração.
 */
export async function notificarInterno(assunto: string, corpo: string): Promise<void> {
  const destino = process.env.LEAD_NOTIFY_EMAIL
  const chave = process.env.RESEND_API_KEY
  const remetente = process.env.NOTIFY_FROM ?? 'master@hayatecnologia.com.br'

  if (!destino || !chave) {
    console.info(`[aviso interno] ${assunto}\n${corpo}`)
    return
  }

  const resposta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${chave}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `HAYA Master <${remetente}>`,
      to: destino.split(',').map((e) => e.trim()),
      subject: assunto,
      text: corpo,
    }),
  })

  if (!resposta.ok) {
    console.error('[aviso interno] falha no envio', await resposta.text())
  }
}

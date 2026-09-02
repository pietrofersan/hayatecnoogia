import { env } from './env.js'
import { logger } from './logger.js'
import { iniciarServidor } from './server.js'
import { supabase } from './supabase.js'
import { conectar } from './whatsapp.js'

async function main() {
  const { data: canal, error } = await supabase
    .from('channel_accounts')
    .select('id')
    .eq('workspace_id', env.workspaceId())
    .eq('channel', 'whatsapp_qr')
    .eq('external_id', env.canalExternalId())
    .maybeSingle()

  if (error || !canal) {
    throw new Error(
      `channel_accounts não encontrado (workspace=${env.workspaceId()}, external_id=${env.canalExternalId()}) — crie a linha antes de subir este serviço.`,
    )
  }

  iniciarServidor()
  await conectar(canal.id)
}

main().catch((err) => {
  logger.error({ err }, 'falha fatal ao iniciar o adaptador de WhatsApp')
  process.exit(1)
})

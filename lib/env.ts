/**
 * Leitura de env com erro explícito. Nunca importe as chaves de servidor
 * (service role, Asaas, ZapSign) em componentes client.
 */

function obrigatoria(nome: string): string {
  const valor = process.env[nome]
  if (!valor) throw new Error(`Variável de ambiente ausente: ${nome}`)
  return valor
}

export const env = {
  supabaseUrl: () => obrigatoria('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => obrigatoria('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceKey: () => obrigatoria('SUPABASE_SERVICE_ROLE_KEY'),

  asaasApiKey: () => obrigatoria('ASAAS_API_KEY'),
  // `||`, não `??`: uma env var configurada com valor vazio na Vercel não é
  // "ausente" pro runtime, mas também não deve virar URL sem esquema.
  asaasBaseUrl: () =>
    process.env.ASAAS_BASE_URL || 'https://api-sandbox.asaas.com/v3',
  asaasWebhookToken: () => obrigatoria('ASAAS_WEBHOOK_TOKEN'),

  zapsignToken: () => obrigatoria('ZAPSIGN_TOKEN'),
  zapsignBaseUrl: () =>
    process.env.ZAPSIGN_BASE_URL || 'https://sandbox.api.zapsign.com.br/api/v1',
  zapsignWebhookToken: () => obrigatoria('ZAPSIGN_WEBHOOK_TOKEN'),

  leadNotifyEmail: () => process.env.LEAD_NOTIFY_EMAIL ?? null,
  cronSecret: () => obrigatoria('CRON_SECRET'),
  appUrl: () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  geminiApiKey: () => process.env.GEMINI_API_KEY ?? null,
}

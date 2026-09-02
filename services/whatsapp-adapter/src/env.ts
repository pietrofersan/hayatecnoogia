function obrigatoria(nome: string): string {
  const valor = process.env[nome]
  if (!valor) throw new Error(`Variável de ambiente ausente: ${nome}`)
  return valor
}

export const env = {
  supabaseUrl: () => obrigatoria('SUPABASE_URL'),
  supabaseServiceKey: () => obrigatoria('SUPABASE_SERVICE_ROLE_KEY'),
  /** Mesmo workspace único que o Master usa — lib/crm.ts do app principal. */
  workspaceId: () =>
    process.env.CRM_WORKSPACE_ID || '00000000-0000-0000-0000-000000000001',
  /** external_id do canal em channel_accounts (não é o número — é fixo). */
  canalExternalId: () => process.env.CANAL_EXTERNAL_ID || 'principal',
  porta: () => Number(process.env.PORT) || 3000,
}

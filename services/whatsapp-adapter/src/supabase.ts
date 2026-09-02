import { createClient } from '@supabase/supabase-js'
import { env } from './env.js'

/**
 * Service role — este processo não passa por RLS de usuário nenhum, é a
 * própria ponte entre o WhatsApp e o banco. Nunca reusar essa chave em
 * código que atenda requisição de fora (só o cron de saída e o handler de
 * eventos do Baileys chamam isto).
 */
export const supabase = createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
  auth: { persistSession: false },
})

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { env } from './env'

/**
 * Cliente ligado à sessão do usuário (respeita RLS).
 * Use em Server Components e Route Handlers autenticados.
 */
export async function supabaseServidor() {
  const cookieStore = await cookies()
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (lista: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          lista.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Server Component não pode escrever cookie: o middleware renova a sessão.
        }
      },
    },
  })
}

/**
 * Cliente com service role — ignora RLS.
 * Só para webhooks, endpoint público de leads, crons e scripts.
 * NUNCA importar em código que roda no browser.
 */
export function supabaseAdmin() {
  return createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

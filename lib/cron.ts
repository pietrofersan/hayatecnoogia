import { env } from './env'

/** Vercel Cron assina com Authorization: Bearer $CRON_SECRET. */
export function cronAutorizado(request: Request): boolean {
  const cabecalho = request.headers.get('authorization')
  return cabecalho === `Bearer ${env.cronSecret()}`
}

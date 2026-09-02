import pino from 'pino'

/** Formato que o Baileys espera de logger (Utils/logger ILogger). */
export type ILogger = {
  level: string
  child(bindings: Record<string, unknown>): ILogger
  trace(obj: unknown, msg?: string): void
  debug(obj: unknown, msg?: string): void
  info(obj: unknown, msg?: string): void
  warn(obj: unknown, msg?: string): void
  error(obj: unknown, msg?: string): void
}

export const logger = pino({ level: process.env.LOG_LEVEL || 'info' }) as unknown as ILogger

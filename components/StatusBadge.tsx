import type { ReactNode } from 'react'
import { cn } from './cn'

export type TomBadge =
  | 'verde'
  | 'ambar'
  | 'magenta'
  | 'azul'
  | 'ciano'
  | 'roxo'
  | 'neutro'

const TOM: Record<TomBadge, string> = {
  verde: 'border-verde/35 bg-verde/10 text-verde',
  ambar: 'border-ambar/40 bg-ambar/12 text-ambar',
  magenta: 'border-magenta/45 bg-magenta/12 text-magenta-claro',
  azul: 'border-azul/40 bg-azul/10 text-azul-claro',
  ciano: 'border-ciano/40 bg-ciano/10 text-ciano-claro',
  roxo: 'border-roxo/40 bg-roxo/10 text-roxo-claro',
  neutro: 'border-borda-forte/70 bg-white/[0.04] text-fraco',
}

const GLOW: Partial<Record<TomBadge, string>> = {
  verde: 'shadow-glow-verde',
  ambar: 'shadow-glow-ambar',
  magenta: 'shadow-glow-magenta',
}

/**
 * Estado nunca é só cor: o badge sempre carrega rótulo, e o ponto pulsante
 * marca o que está aguardando (README §"Acentos neon e semântica").
 */
export function StatusBadge({
  tom = 'neutro',
  ponto,
  brilho,
  children,
}: {
  tom?: TomBadge
  ponto?: boolean
  brilho?: boolean
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-chip border px-[11px] py-1 font-mono text-[10.5px] font-medium whitespace-nowrap',
        TOM[tom],
        brilho && GLOW[tom],
      )}
    >
      {ponto && (
        <span className="size-1.5 shrink-0 animate-pulso rounded-full bg-current" />
      )}
      {children}
    </span>
  )
}

/** Ponto de status de 7px usado em listas de log, alertas e agenda. */
export function Ponto({ tom = 'azul', pulsa }: { tom?: TomBadge; pulsa?: boolean }) {
  const cor: Record<TomBadge, string> = {
    verde: 'text-verde',
    ambar: 'text-ambar',
    magenta: 'text-magenta',
    azul: 'text-azul',
    ciano: 'text-ciano',
    roxo: 'text-roxo',
    neutro: 'text-fantasma',
  }
  return (
    <span
      aria-hidden
      className={cn(
        'size-[7px] shrink-0 rounded-full bg-current',
        cor[tom],
        pulsa && 'animate-pulso',
      )}
      style={{ boxShadow: '0 0 10px currentColor' }}
    />
  )
}

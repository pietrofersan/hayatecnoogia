import type { ComponentProps } from 'react'
import Link from 'next/link'
import { cn } from './cn'

const BASE =
  'inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-chip border px-3.5 py-[7px] font-mono text-[11px] font-medium whitespace-nowrap transition-colors'

const ATIVO = 'border-ciano/40 bg-ciano/12 text-ciano-claro shadow-glow-ciano'
const INATIVO = 'border-borda bg-transparent text-tenue hover:text-corpo'

/** Chip de filtro clicável — toggle ou seleção única, sempre com contagem. */
export function Chip({
  ativo,
  className,
  ...resto
}: ComponentProps<'button'> & { ativo?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      {...resto}
      className={cn(BASE, ativo ? ATIVO : INATIVO, className)}
    />
  )
}

/** Mesma pílula, mas navegando por querystring (server components). */
export function ChipLink({
  ativo,
  className,
  children,
  ...resto
}: ComponentProps<typeof Link> & { ativo?: boolean }) {
  return (
    <Link
      {...resto}
      aria-current={ativo ? 'true' : undefined}
      className={cn(BASE, ativo ? ATIVO : INATIVO, className)}
    >
      {children}
    </Link>
  )
}

export function Contagem({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] opacity-70">· {children}</span>
}

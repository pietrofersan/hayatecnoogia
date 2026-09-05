import type { ComponentProps, ReactNode } from 'react'
import Link from 'next/link'
import { cn } from './cn'

const BASE =
  'w-full rounded-ctrl border border-borda-forte bg-[rgba(10,15,30,.72)] px-3.5 py-2.5 text-[13px] text-pleno outline-none transition placeholder:text-fantasma focus:border-ciano focus:shadow-[0_0_0_3px_rgba(34,211,238,.12)]'

export function Campo({
  rotulo,
  children,
  dica,
}: {
  rotulo: string
  children: ReactNode
  dica?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[9.5px] tracking-[0.2em] text-fantasma uppercase">
        {rotulo}
      </span>
      {children}
      {dica && <span className="mt-1.5 block text-[11px] text-tenue">{dica}</span>}
    </label>
  )
}

export function Entrada(props: ComponentProps<'input'>) {
  return <input {...props} className={cn(BASE, props.className)} />
}

export function Selecao(props: ComponentProps<'select'>) {
  return <select {...props} className={cn(BASE, props.className)} />
}

export function AreaTexto(props: ComponentProps<'textarea'>) {
  return <textarea {...props} className={cn(BASE, props.className)} />
}

export type VarianteBotao =
  | 'primario'
  | 'secundario'
  | 'roxo'
  | 'verde'
  | 'magenta'
  | 'texto'

const VARIANTE: Record<VarianteBotao, string> = {
  primario:
    'border-transparent bg-linear-to-r from-ciano to-azul text-abismo shadow-glow-ciano hover:brightness-110',
  secundario:
    'border-borda-forte bg-white/[0.03] text-suave hover:border-azul/45 hover:text-corpo',
  roxo: 'border-roxo/40 bg-roxo/12 text-roxo-claro hover:bg-roxo/20',
  verde: 'border-verde/40 bg-verde/12 text-verde hover:bg-verde/20',
  magenta: 'border-magenta/45 bg-magenta/12 text-magenta-claro hover:bg-magenta/20',
  texto: 'border-transparent text-tenue hover:text-corpo',
}

const BOTAO =
  'inline-flex min-h-[36px] cursor-pointer items-center justify-center gap-2 rounded-btn border px-[15px] text-[12.5px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40'

export function Botao({
  variante = 'primario',
  className,
  ...props
}: ComponentProps<'button'> & { variante?: VarianteBotao }) {
  return <button {...props} className={cn(BOTAO, VARIANTE[variante], className)} />
}

/** Mesmo botão, navegando — usado nas ações de cabeçalho de tela. */
export function BotaoLink({
  variante = 'secundario',
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variante?: VarianteBotao; children: ReactNode }) {
  return (
    <Link {...props} className={cn(BOTAO, VARIANTE[variante], className)}>
      {children}
    </Link>
  )
}

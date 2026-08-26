import type { ReactNode } from 'react'

const BASE =
  'w-full rounded-lg border border-linha bg-noite px-3 py-2 text-sm text-marfim outline-none placeholder:text-apagado focus:border-tec'

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
      <span className="mb-1 block text-[11px] tracking-wide text-nevoa uppercase">
        {rotulo}
      </span>
      {children}
      {dica && <span className="mt-1 block text-[11px] text-apagado">{dica}</span>}
    </label>
  )
}

export function Entrada(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${BASE} ${props.className ?? ''}`} />
}

export function Selecao(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${BASE} ${props.className ?? ''}`} />
}

export function AreaTexto(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${BASE} ${props.className ?? ''}`} />
}

export function Botao({
  variante = 'primario',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario'
}) {
  const classe =
    variante === 'primario'
      ? 'bg-tec text-noite hover:opacity-90'
      : 'border border-linha text-ink-2 hover:border-nevoa hover:text-marfim'
  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50 ${classe} ${props.className ?? ''}`}
    />
  )
}

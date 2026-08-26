import type { ReactNode } from 'react'

/** Contêiner base do dashboard: painel sobre a noite, borda de 1px na linha. */
export function Painel({
  titulo,
  acao,
  children,
  className = '',
}: {
  titulo?: string
  acao?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-xl border border-linha bg-painel p-5 ${className}`}
    >
      {(titulo || acao) && (
        <header className="mb-4 flex items-baseline justify-between gap-3">
          {titulo && (
            <h2 className="text-[13px] font-medium tracking-wide text-ink-2 uppercase">
              {titulo}
            </h2>
          )}
          {acao}
        </header>
      )}
      {children}
    </section>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <p className="py-8 text-center text-sm text-apagado">{children}</p>
  )
}

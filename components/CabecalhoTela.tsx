import type { ReactNode } from 'react'

/** Cabeçalho padrão de tela: título 20–22px, linha meta em mono, ações à direita. */
export function CabecalhoTela({
  titulo,
  meta,
  acoes,
}: {
  titulo: ReactNode
  meta?: ReactNode
  acoes?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[21px] leading-tight font-semibold text-pleno">{titulo}</h1>
        {meta && <p className="mt-1.5 font-mono text-[11px] text-tenue">{meta}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2.5">{acoes}</div>}
    </header>
  )
}

/** Faixa de chips de filtro com a contagem do resultado à direita. */
export function BarraFiltros({
  children,
  contagem,
}: {
  children: ReactNode
  contagem?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {contagem && (
        <span className="font-mono text-[10.5px] text-fantasma">{contagem}</span>
      )}
    </div>
  )
}

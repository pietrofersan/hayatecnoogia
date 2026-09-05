import type { ReactNode } from 'react'
import { cn } from './cn'

type Acento = 'nenhum' | 'azul' | 'ciano' | 'roxo' | 'magenta' | 'ambar' | 'verde'

const ACENTO: Record<Acento, string> = {
  nenhum: 'border-borda bg-vidro',
  azul: 'border-azul/30 bg-linear-to-br from-azul/15 to-vidro',
  ciano: 'border-ciano/25 bg-linear-to-br from-ciano/15 to-vidro',
  roxo: 'border-roxo/25 bg-linear-to-br from-roxo/15 to-vidro',
  magenta: 'border-magenta/30 bg-linear-to-br from-magenta/15 to-vidro',
  ambar: 'border-ambar/25 bg-linear-to-br from-ambar/15 to-vidro',
  verde: 'border-verde/25 bg-verde/5',
}

const DENSIDADE = { kpi: 'p-4', card: 'p-[18px]', painel: 'p-[22px]' } as const

/**
 * Painel de vidro: 1px de borda luminosa, blur 18px e realce inset.
 * É o contêiner de todo conteúdo do painel (README §"Superfícies").
 */
export function Painel({
  titulo,
  nota,
  acao,
  acento = 'nenhum',
  densidade = 'painel',
  children,
  className = '',
}: {
  titulo?: ReactNode
  nota?: ReactNode
  acao?: ReactNode
  acento?: Acento
  densidade?: keyof typeof DENSIDADE
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-card border shadow-vidro backdrop-blur-[18px] transition-colors hover:border-azul/45',
        ACENTO[acento],
        DENSIDADE[densidade],
        className,
      )}
    >
      {(titulo || acao || nota) && (
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            {titulo && (
              <h2 className="text-[13.5px] leading-tight font-semibold text-pleno">
                {titulo}
              </h2>
            )}
            {nota && (
              <p className="mt-1 font-mono text-[10.5px] text-fantasma">{nota}</p>
            )}
          </div>
          {acao}
        </header>
      )}
      {children}
    </section>
  )
}

/**
 * Estado vazio: ícone tracejado de 52px, frase e ação de saída — toda lista
 * filtrável precisa de um (README §"Interações").
 */
export function Vazio({
  children,
  descricao,
  acao,
  icone = '⌗',
}: {
  children: ReactNode
  descricao?: ReactNode
  acao?: ReactNode
  icone?: string
}) {
  return (
    <div className="px-5 py-[46px] text-center">
      <div
        aria-hidden
        className="mx-auto grid size-[52px] place-items-center rounded-[16px] border border-dashed border-borda-forte text-[18px] text-fantasma"
      >
        {icone}
      </div>
      <p className="mt-4 text-[13px] text-suave">{children}</p>
      {descricao && <p className="mt-1.5 text-[11.5px] text-fantasma">{descricao}</p>}
      {acao && <div className="mt-4 flex justify-center">{acao}</div>}
    </div>
  )
}

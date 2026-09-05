import type { ReactNode } from 'react'
import { cn } from './cn'
import { Painel } from './Painel'
import { Sparkline } from './Sparkline'

export type AcentoKpi = 'azul' | 'ciano' | 'roxo' | 'magenta' | 'ambar' | 'verde'

type Tendencia = { valor: number; rotulo: string }

/** O número domina e brilha na cor do acento; o rótulo fica em mono apagado. */
const VALOR: Record<AcentoKpi, string> = {
  azul: 'text-pleno [text-shadow:0_0_26px_rgba(76,111,255,.60)]',
  ciano: 'text-pleno [text-shadow:0_0_26px_rgba(34,211,238,.55)]',
  roxo: 'text-pleno [text-shadow:0_0_26px_rgba(168,85,247,.55)]',
  magenta: 'text-magenta-palido [text-shadow:0_0_26px_rgba(240,51,143,.60)]',
  ambar: 'text-[#FFDCA8] [text-shadow:0_0_26px_rgba(245,165,36,.50)]',
  verde: 'text-verde [text-shadow:0_0_26px_rgba(52,229,176,.50)]',
}

const TRACO: Record<AcentoKpi, string> = {
  azul: '#6E8CFF',
  ciano: '#22D3EE',
  roxo: '#C084FC',
  magenta: '#F0338F',
  ambar: '#F5A524',
  verde: '#34E5B0',
}

/** `destaque` continua aceito para as chamadas semânticas antigas. */
const DESTAQUE = { ok: 'verde', alerta: 'ambar', critico: 'magenta' } as const

export function KpiTile({
  rotulo,
  valor,
  detalhe,
  tendencia,
  destaque,
  acento,
  serie,
  icone,
}: {
  rotulo: string
  valor: string
  detalhe?: ReactNode
  tendencia?: Tendencia
  destaque?: keyof typeof DESTAQUE
  acento?: AcentoKpi
  /** série da sparkline; omita para KPI sem gráfico */
  serie?: number[]
  icone?: ReactNode
}) {
  const tom: AcentoKpi = acento ?? (destaque ? DESTAQUE[destaque] : 'azul')

  return (
    <Painel
      acento={tom}
      densidade="kpi"
      className="relative overflow-hidden shadow-kpi"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[9.5px] font-medium tracking-[0.2em] text-[#7E8DB5] uppercase">
          {rotulo}
        </p>
        {icone && (
          <span className="grid size-6 place-items-center rounded-lg bg-white/5 text-[11px]">
            {icone}
          </span>
        )}
      </div>

      <p
        className={cn(
          'tabular mt-3.5 font-mono text-[30px] leading-none font-semibold',
          VALOR[tom],
        )}
      >
        {valor}
      </p>

      {(detalhe || tendencia) && (
        <div className="relative z-10 mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-tenue">
          {tendencia && (
            <span className={tendencia.valor >= 0 ? 'text-verde' : 'text-magenta-claro'}>
              {tendencia.valor >= 0 ? '▲' : '▼'}{' '}
              {Math.abs(tendencia.valor).toLocaleString('pt-BR', {
                maximumFractionDigits: 1,
              })}
              % {tendencia.rotulo}
            </span>
          )}
          {detalhe}
        </div>
      )}

      {serie && (
        <Sparkline
          serie={serie}
          cor={TRACO[tom]}
          className="pointer-events-none absolute right-0 bottom-0 h-10 w-[62%] opacity-80"
        />
      )}
    </Painel>
  )
}

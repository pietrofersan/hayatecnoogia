import type { ReactNode } from 'react'

type Tendencia = { valor: number; rotulo: string }

/**
 * KPI grande do topo do dashboard. O número domina; o rótulo fica em tinta
 * apagada. Variação nunca é só cor — vem com sinal e rótulo.
 */
export function KpiTile({
  rotulo,
  valor,
  detalhe,
  tendencia,
  destaque,
}: {
  rotulo: string
  valor: string
  detalhe?: ReactNode
  tendencia?: Tendencia
  destaque?: 'ok' | 'alerta' | 'critico'
}) {
  const corValor =
    destaque === 'critico'
      ? 'text-critico'
      : destaque === 'alerta'
        ? 'text-alerta'
        : destaque === 'ok'
          ? 'text-ok'
          : 'text-marfim'

  return (
    <div className="rounded-xl border border-linha bg-painel p-5">
      <p className="text-[11px] font-medium tracking-[0.08em] text-nevoa uppercase">
        {rotulo}
      </p>
      <p className={`tabular mt-3 text-3xl leading-none font-semibold ${corValor}`}>
        {valor}
      </p>
      {(detalhe || tendencia) && (
        <div className="mt-3 flex items-center gap-2 text-xs text-apagado">
          {tendencia && (
            <span className={tendencia.valor >= 0 ? 'text-ok' : 'text-critico'}>
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
    </div>
  )
}

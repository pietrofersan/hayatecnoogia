/**
 * Barra fina horizontal, uma linha por categoria.
 * Regras de gráfico validadas (seção 8): ponta 4px arredondada só no lado
 * do dado, rótulo direto seletivo, texto sempre em tinta — nunca na cor
 * da série — e tooltip em todo gráfico.
 */
export function BarRow({
  rotulo,
  valor,
  maximo,
  cor,
  valorFormatado,
  dica,
}: {
  rotulo: string
  valor: number
  maximo: number
  cor: string
  valorFormatado: string
  dica?: string
}) {
  const largura = maximo > 0 ? Math.max((valor / maximo) * 100, valor > 0 ? 1.5 : 0) : 0

  return (
    <div className="group grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 py-1.5">
      <span className="truncate text-xs text-corpo">{rotulo}</span>
      <span
        className="h-2 rounded-r-[4px] bg-borda/60"
        title={dica ?? `${rotulo}: ${valorFormatado}`}
      >
        <span
          className="block h-2 rounded-r-[4px] transition-[width] duration-500"
          style={{ width: `${largura}%`, background: cor }}
        />
      </span>
      <span className="tabular text-xs text-corpo">{valorFormatado}</span>
    </div>
  )
}

/**
 * Barra vertical empilhada por status — 2px de gap entre segmentos,
 * ponta arredondada só no topo da pilha.
 */
export function BarraEmpilhada({
  segmentos,
  altura = 160,
  total,
}: {
  segmentos: { rotulo: string; valor: number; cor: string }[]
  altura?: number
  total: number
}) {
  return (
    <div
      className="flex w-full flex-col justify-end gap-[2px]"
      style={{ height: altura }}
    >
      {segmentos
        .filter((s) => s.valor > 0)
        .map((s, i) => (
          <div
            key={s.rotulo}
            className={i === 0 ? 'rounded-t-[4px]' : ''}
            style={{
              height: `${total > 0 ? (s.valor / total) * 100 : 0}%`,
              background: s.cor,
            }}
            title={`${s.rotulo}: ${s.valor}`}
          />
        ))}
    </div>
  )
}

/** Colunas de receita mês a mês. Série única — sem legenda, por regra. */
export function ColunasMensais({
  dados,
  formatar,
}: {
  dados: { rotulo: string; valor: number }[]
  formatar: (v: number) => string
}) {
  const maximo = Math.max(...dados.map((d) => d.valor), 1)

  return (
    <div className="flex h-40 gap-3">
      {dados.map((d) => (
        <div key={d.rotulo} className="flex h-full flex-1 flex-col items-center gap-2">
          {/* O trilho precisa de altura definida para a barra em % resolver. */}
          <div className="flex w-full flex-1 items-end justify-center">
            <div
              className="w-full max-w-10 rounded-t-[4px] bg-azul transition-[height] duration-500"
              style={{ height: `${Math.max((d.valor / maximo) * 100, 2)}%` }}
              title={`${d.rotulo}: ${formatar(d.valor)}`}
            />
          </div>
          <span className="text-[10px] tracking-wide text-tenue uppercase">
            {d.rotulo}
          </span>
        </div>
      ))}
    </div>
  )
}

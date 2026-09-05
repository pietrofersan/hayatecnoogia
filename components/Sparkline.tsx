/** Sparkline de 1.8px, sem eixo e sem grade. Só dentro de KpiTile. */
export function Sparkline({
  serie,
  cor,
  className,
}: {
  serie: number[]
  cor: string
  className?: string
}) {
  if (serie.length < 2) return null

  const max = Math.max(...serie)
  const min = Math.min(...serie)
  const amplitude = max - min || 1
  const pontos = serie
    .map((v, i) => {
      const x = (i / (serie.length - 1)) * 140
      const y = 30 - ((v - min) / amplitude) * 26
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      viewBox="0 0 140 34"
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <polyline
        points={pontos}
        fill="none"
        stroke={cor}
        strokeWidth={1.8}
        style={{ filter: `drop-shadow(0 0 6px ${cor})` }}
      />
    </svg>
  )
}

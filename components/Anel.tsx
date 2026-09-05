import { cn } from './cn'

/**
 * Anel de saúde: conic-gradient ciano → azul → roxo até a fatia preenchida,
 * o resto em borda apagada. O miolo é breu, com o número e o rótulo.
 */
export function Anel({
  percentual,
  rotulo,
  tamanho = 112,
  className,
}: {
  percentual: number
  rotulo: string
  tamanho?: number
  className?: string
}) {
  const p = Math.max(0, Math.min(100, Math.round(percentual)))
  const grau = (p / 100) * 360

  return (
    <div
      className={cn('relative grid shrink-0 place-items-center', className)}
      style={{ width: tamanho, height: tamanho }}
      role="img"
      aria-label={`${rotulo}: ${p}%`}
    >
      <div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(#22D3EE 0deg, #4C6FFF ${grau * 0.5}deg, #A855F7 ${grau}deg, rgba(120,150,255,.12) ${grau}deg)`,
          filter: 'drop-shadow(0 0 18px rgba(76,111,255,.35))',
        }}
      />
      <div
        className="relative grid place-items-center rounded-full bg-breu"
        style={{ width: tamanho - 22, height: tamanho - 22 }}
      >
        <span className="tabular font-mono text-[22px] leading-none font-semibold text-pleno">
          {p}%
        </span>
        <span className="mt-1 font-mono text-[9px] tracking-[0.2em] text-fantasma uppercase">
          {rotulo}
        </span>
      </div>
    </div>
  )
}

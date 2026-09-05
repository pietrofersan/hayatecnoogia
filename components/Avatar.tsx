import { cn } from './cn'

/** Iniciais sobre o gradiente da marca (ciano → azul → roxo). */
export function Avatar({
  nome,
  tamanho = 36,
  className,
}: {
  nome: string | null | undefined
  tamanho?: number
  className?: string
}) {
  const iniciais = (nome ?? '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()

  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-[linear-gradient(140deg,#22D3EE_0%,#4C6FFF_60%,#A855F7_100%)] font-mono font-semibold text-abismo',
        className,
      )}
      style={{
        width: tamanho,
        height: tamanho,
        fontSize: Math.round(tamanho * 0.34),
      }}
    >
      {iniciais || '?'}
    </span>
  )
}

import Image from 'next/image'
import { cn } from './cn'

/**
 * Logo completa (barras ciano → azul → roxo, wordmark marfim).
 * Larguras do handoff: 210px login · 168px sidebar · 124px mobile.
 */
export function Logo({
  largura = 168,
  className,
}: {
  largura?: number
  className?: string
}) {
  return (
    <Image
      src="/marca/haya-logo-neon.svg"
      alt="HAYA"
      width={largura}
      height={Math.round((largura * 3968.83) / 11766.04)}
      priority
      className={cn('h-auto', className)}
    />
  )
}

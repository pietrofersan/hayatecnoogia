import { ROTULO_FRENTE, type Frente } from '@/lib/db'

/** Uma cor por frente, na ordem fixa digital → tecnologia → visual (comunicação fica neutra). */
export const CORES_FRENTE: Record<Frente, string> = {
  digital: 'var(--color-magenta)',
  tecnologia: 'var(--color-azul)',
  visual: 'var(--color-verde)',
  comunicacao: 'var(--color-suave)',
}

const CLASSES: Record<Frente, string> = {
  digital: 'text-magenta-claro bg-magenta/10 border-magenta/30',
  tecnologia: 'text-azul-claro bg-azul/10 border-azul/30',
  visual: 'text-verde bg-verde/10 border-verde/30',
  comunicacao: 'text-suave bg-white/[0.04] border-borda-forte/70',
}

export function FrenteTag({ frente }: { frente: Frente }) {
  return (
    <span
      className={`inline-flex items-center rounded-chip border px-[11px] py-1 font-mono text-[10.5px] font-medium whitespace-nowrap ${CLASSES[frente]}`}
    >
      {ROTULO_FRENTE[frente]}
    </span>
  )
}

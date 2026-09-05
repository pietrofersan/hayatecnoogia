import { ROTULO_FRENTE, type Frente } from '@/lib/db'

/** Categóricas validadas, ordem fixa dig → tec → vis (comunicação usa névoa). */
export const CORES_FRENTE: Record<Frente, string> = {
  digital: 'var(--color-magenta)',
  tecnologia: 'var(--color-azul)',
  visual: 'var(--color-verde)',
  comunicacao: 'var(--color-fantasma)',
}

const CLASSES: Record<Frente, string> = {
  digital: 'text-magenta bg-magenta/10 border-magenta/25',
  tecnologia: 'text-azul bg-azul/10 border-azul/25',
  visual: 'text-verde bg-verde/10 border-verde/25',
  comunicacao: 'text-suave bg-suave/10 border-suave/25',
}

export function FrenteTag({ frente }: { frente: Frente }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${CLASSES[frente]}`}
    >
      {ROTULO_FRENTE[frente]}
    </span>
  )
}

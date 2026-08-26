import { ROTULO_FRENTE, type Frente } from '@/lib/db'

/** Categóricas validadas, ordem fixa dig → tec → vis (comunicação usa névoa). */
export const CORES_FRENTE: Record<Frente, string> = {
  digital: 'var(--color-dig)',
  tecnologia: 'var(--color-tec)',
  visual: 'var(--color-vis)',
  comunicacao: 'var(--color-com)',
}

const CLASSES: Record<Frente, string> = {
  digital: 'text-dig bg-dig/10 border-dig/25',
  tecnologia: 'text-tec bg-tec/10 border-tec/25',
  visual: 'text-vis bg-vis/10 border-vis/25',
  comunicacao: 'text-nevoa bg-nevoa/10 border-nevoa/25',
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

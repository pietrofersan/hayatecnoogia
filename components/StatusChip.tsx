import type { StatusCobranca, StatusContrato } from '@/lib/db'
import { StatusBadge, type TomBadge } from './StatusBadge'

/** Status nunca é só cor: sempre rótulo + ícone (regra do sistema Haya). */
const COBRANCA: Record<StatusCobranca, { rotulo: string; icone: string; tom: TomBadge }> = {
  pendente: { rotulo: 'Pendente', icone: '○', tom: 'neutro' },
  paga: { rotulo: 'Paga', icone: '✓', tom: 'verde' },
  vencida: { rotulo: 'Vencida', icone: '!', tom: 'magenta' },
  cancelada: { rotulo: 'Cancelada', icone: '×', tom: 'neutro' },
  estornada: { rotulo: 'Estornada', icone: '↩', tom: 'ambar' },
}

const CONTRATO: Record<StatusContrato, { rotulo: string; icone: string; tom: TomBadge }> = {
  rascunho: { rotulo: 'Rascunho', icone: '◌', tom: 'neutro' },
  enviado: { rotulo: 'Enviado', icone: '→', tom: 'azul' },
  assinado: { rotulo: 'Assinado', icone: '✎', tom: 'roxo' },
  ativo: { rotulo: 'Ativo', icone: '✓', tom: 'verde' },
  suspenso: { rotulo: 'Suspenso', icone: '‖', tom: 'ambar' },
  encerrado: { rotulo: 'Encerrado', icone: '×', tom: 'neutro' },
}

function Chip({ rotulo, icone, tom }: { rotulo: string; icone: string; tom: TomBadge }) {
  return (
    <StatusBadge tom={tom}>
      <span aria-hidden>{icone}</span>
      {rotulo}
    </StatusBadge>
  )
}

export function StatusChip({ status }: { status: StatusCobranca }) {
  return <Chip {...COBRANCA[status]} />
}

export function StatusContratoChip({ status }: { status: StatusContrato }) {
  return <Chip {...CONTRATO[status]} />
}

export const CORES_STATUS_COBRANCA: Record<StatusCobranca, string> = {
  paga: 'var(--color-verde)',
  pendente: 'var(--color-suave)',
  vencida: 'var(--color-magenta)',
  estornada: 'var(--color-ambar)',
  cancelada: 'var(--color-fantasma)',
}

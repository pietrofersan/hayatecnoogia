import type { StatusCobranca, StatusContrato } from '@/lib/db'

/** Status nunca é só cor: sempre rótulo + ícone (regra do sistema Haya). */
const COBRANCA: Record<StatusCobranca, { rotulo: string; icone: string; classe: string }> = {
  pendente: { rotulo: 'Pendente', icone: '○', classe: 'text-nevoa border-nevoa/30' },
  paga: { rotulo: 'Paga', icone: '✓', classe: 'text-ok border-ok/30' },
  vencida: { rotulo: 'Vencida', icone: '!', classe: 'text-critico border-critico/40' },
  cancelada: { rotulo: 'Cancelada', icone: '×', classe: 'text-apagado border-apagado/30' },
  estornada: { rotulo: 'Estornada', icone: '↩', classe: 'text-alerta border-alerta/40' },
}

const CONTRATO: Record<StatusContrato, { rotulo: string; icone: string; classe: string }> = {
  rascunho: { rotulo: 'Rascunho', icone: '◌', classe: 'text-apagado border-apagado/30' },
  enviado: { rotulo: 'Enviado', icone: '→', classe: 'text-tec border-tec/40' },
  assinado: { rotulo: 'Assinado', icone: '✎', classe: 'text-vis border-vis/40' },
  ativo: { rotulo: 'Ativo', icone: '✓', classe: 'text-ok border-ok/40' },
  suspenso: { rotulo: 'Suspenso', icone: '‖', classe: 'text-alerta border-alerta/40' },
  encerrado: { rotulo: 'Encerrado', icone: '×', classe: 'text-apagado border-apagado/30' },
}

function Chip({ rotulo, icone, classe }: { rotulo: string; icone: string; classe: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${classe}`}
    >
      <span aria-hidden>{icone}</span>
      {rotulo}
    </span>
  )
}

export function StatusChip({ status }: { status: StatusCobranca }) {
  return <Chip {...COBRANCA[status]} />
}

export function StatusContratoChip({ status }: { status: StatusContrato }) {
  return <Chip {...CONTRATO[status]} />
}

export const CORES_STATUS_COBRANCA: Record<StatusCobranca, string> = {
  paga: 'var(--color-ok)',
  pendente: 'var(--color-nevoa)',
  vencida: 'var(--color-critico)',
  estornada: 'var(--color-alerta)',
  cancelada: 'var(--color-apagado)',
}

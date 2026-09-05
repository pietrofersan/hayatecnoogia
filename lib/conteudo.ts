import type { CanalConteudo, StatusConteudo } from './db'
import type { TomBadge } from '@/components/StatusBadge'

/**
 * Cada canal tem cor própria no handoff (chips do calendário, borda do
 * cartão, hora do post). Não é a paleta semântica — é identidade de canal,
 * por isso vive aqui e não em StatusBadge.
 */
export const COR_CANAL: Record<CanalConteudo, { texto: string; borda: string; fundo: string }> =
  {
    instagram: {
      texto: 'text-magenta-claro',
      borda: 'border-magenta/35',
      fundo: 'bg-magenta/10',
    },
    facebook: { texto: 'text-azul-claro', borda: 'border-azul/35', fundo: 'bg-azul/10' },
    tiktok: { texto: 'text-ciano-claro', borda: 'border-ciano/35', fundo: 'bg-ciano/10' },
    blog: { texto: 'text-roxo-claro', borda: 'border-roxo/35', fundo: 'bg-roxo/10' },
    youtube: { texto: 'text-ambar', borda: 'border-ambar/35', fundo: 'bg-ambar/10' },
  }

export const TOM_CANAL: Record<CanalConteudo, TomBadge> = {
  instagram: 'magenta',
  facebook: 'azul',
  tiktok: 'ciano',
  blog: 'roxo',
  youtube: 'ambar',
}

/** Verde = pronto, âmbar = precisa de gente, cinza = ainda nascendo. */
export const TOM_STATUS_CONTEUDO: Record<StatusConteudo, TomBadge> = {
  rascunho: 'neutro',
  aguardando: 'ambar',
  aprovado: 'verde',
  publicado: 'azul',
}

/** Custo vem em centésimos de dólar (US$ 0,02 = 2). */
export function formatCustoUSD(centesimos: number): string {
  return `US$ ${(centesimos / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/** Segunda-feira da semana de uma data, às 00:00 local. */
export function segundaDaSemana(base: Date): Date {
  const d = new Date(base)
  d.setHours(0, 0, 0, 0)
  // getDay(): 0 = domingo. Segunda vira o dia 0 da nossa grade.
  const diasDesdeSegunda = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diasDesdeSegunda)
  return d
}

export function somarDias(base: Date, dias: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + dias)
  return d
}

export function formatDiaMes(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export const DIAS_CURTOS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'] as const

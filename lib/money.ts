/** Toda moeda circula em centavos (bigint no banco, number no app). */

export function formatBRL(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100)
}

/** Compacto para KPIs: R$ 12,4 mil / R$ 1,2 mi */
export function formatBRLCompacto(centavos: number): string {
  const reais = centavos / 100
  if (Math.abs(reais) >= 1_000_000) {
    return `R$ ${(reais / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  }
  if (Math.abs(reais) >= 1_000) {
    return `R$ ${(reais / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  }
  return formatBRL(centavos)
}

/** Centavos -> número decimal aceito pelo Asaas (value: 149.9). */
export function centavosParaAsaas(centavos: number): number {
  return Math.round(centavos) / 100
}

/** Valor do Asaas (149.9) -> centavos. */
export function asaasParaCentavos(valor: number): number {
  return Math.round(valor * 100)
}

/** "1.499,90" | "1499.90" | "R$ 1.499,90" -> 149990 */
export function parseParaCentavos(entrada: string): number {
  const limpo = entrada.replace(/[^\d,.-]/g, '')
  // Se tem vírgula, ela é o separador decimal (pt-BR).
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo
  const n = Number(normalizado)
  if (!Number.isFinite(n)) throw new Error(`Valor inválido: ${entrada}`)
  return Math.round(n * 100)
}

export function formatData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return d.toLocaleDateString('pt-BR')
}

/** Data (YYYY-MM-DD) do próximo vencimento a partir do dia contratado. */
export function proximoVencimento(diaVencimento: number, base = new Date()): string {
  const dia = Math.min(Math.max(diaVencimento, 1), 28)
  const alvo = new Date(base.getFullYear(), base.getMonth(), dia)
  if (alvo <= base) alvo.setMonth(alvo.getMonth() + 1)
  return alvo.toISOString().slice(0, 10)
}

import { NextResponse } from 'next/server'
import { cronAutorizado } from '@/lib/cron'
import { formatBRL } from '@/lib/money'
import { notificarInterno } from '@/lib/notificacoes'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Resumo semanal da operação (seção 3.6). */
export async function GET(request: Request) {
  if (!cronAutorizado(request)) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const seteDias = new Date(Date.now() - 7 * 864e5).toISOString()
  const seteDiasData = seteDias.slice(0, 10)
  const proximos7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
  const hoje = new Date().toISOString().slice(0, 10)

  const [{ data: recebidas }, { data: vencidas }, { data: aVencer }, { count: leads }] =
    await Promise.all([
      supabase
        .from('cobrancas')
        .select('valor_centavos')
        .eq('status', 'paga')
        .gte('pago_em', seteDias),
      supabase.from('cobrancas').select('valor_centavos').eq('status', 'vencida'),
      supabase
        .from('cobrancas')
        .select('valor_centavos')
        .eq('status', 'pendente')
        .gte('vencimento', hoje)
        .lte('vencimento', proximos7),
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('criado_em', seteDias),
    ])

  const somar = (linhas: { valor_centavos: number }[] | null) =>
    (linhas ?? []).reduce((s, l) => s + Number(l.valor_centavos), 0)

  const corpo = [
    `Semana desde ${seteDiasData}:`,
    `· Recebido: ${formatBRL(somar(recebidas))} em ${recebidas?.length ?? 0} cobrança(s)`,
    `· A vencer nos próximos 7 dias: ${formatBRL(somar(aVencer))} em ${aVencer?.length ?? 0}`,
    `· Inadimplência acumulada: ${formatBRL(somar(vencidas))} em ${vencidas?.length ?? 0}`,
    `· Leads recebidos: ${leads ?? 0}`,
  ].join('\n')

  await notificarInterno('[Master] Resumo semanal', corpo)

  return NextResponse.json({ ok: true })
}

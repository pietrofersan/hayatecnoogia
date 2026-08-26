import { NextResponse } from 'next/server'
import { cronAutorizado } from '@/lib/cron'
import { formatBRL, formatData } from '@/lib/money'
import { notificarInterno } from '@/lib/notificacoes'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Vencida = {
  id: string
  valor_centavos: number
  vencimento: string
  contratos: { codigo: string; clientes: { nome: string } | null } | null
}

/**
 * Cron diário (seção 3.6): marca como vencida o que passou do dia sem
 * pagamento — o webhook PAYMENT_OVERDUE do Asaas é a fonte primária, isto
 * é a rede de segurança — e manda o aviso interno D+1.
 */
export async function GET(request: Request) {
  if (!cronAutorizado(request)) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const hoje = new Date().toISOString().slice(0, 10)
  const ontem = new Date(Date.now() - 864e5).toISOString().slice(0, 10)

  const { data: marcadas } = await supabase
    .from('cobrancas')
    .update({ status: 'vencida' })
    .eq('status', 'pendente')
    .lt('vencimento', hoje)
    .select('id')

  const { data: dOntem } = await supabase
    .from('cobrancas')
    .select('id, valor_centavos, vencimento, contratos(codigo, clientes(nome))')
    .eq('status', 'vencida')
    .eq('vencimento', ontem)

  const vencidasOntem = (dOntem ?? []) as unknown as Vencida[]

  if (vencidasOntem.length > 0) {
    const linhas = vencidasOntem.map(
      (c) =>
        `· ${c.contratos?.clientes?.nome ?? 'cliente'} — ${c.contratos?.codigo ?? '—'} — ` +
        `${formatBRL(Number(c.valor_centavos))} — venceu ${formatData(c.vencimento)}`,
    )
    await notificarInterno(
      `[Master] ${vencidasOntem.length} cobrança(s) vencida(s) ontem`,
      linhas.join('\n'),
    )
  }

  return NextResponse.json({
    ok: true,
    marcadas: marcadas?.length ?? 0,
    avisadas: vencidasOntem.length,
  })
}

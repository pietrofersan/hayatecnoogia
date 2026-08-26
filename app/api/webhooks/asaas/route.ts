import { NextResponse } from 'next/server'
import { statusLocal, type AsaasPayment } from '@/lib/asaas'
import { env } from '@/lib/env'
import { asaasParaCentavos } from '@/lib/money'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type EventoAsaas = { event: string; payment?: AsaasPayment }

/**
 * Webhook do Asaas (seção 3.5).
 * Tudo é gravado em webhook_logs antes de processar; a idempotência vem do
 * unique em cobrancas.asaas_payment_id.
 */
export async function POST(request: Request) {
  const token = request.headers.get('asaas-access-token')
  if (!token || token !== env.asaasWebhookToken()) {
    return NextResponse.json({ erro: 'token inválido' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const corpo = (await request.json().catch(() => null)) as EventoAsaas | null

  const { data: log } = await supabase
    .from('webhook_logs')
    .insert({ origem: 'asaas', evento: corpo?.event ?? null, payload: corpo })
    .select('id')
    .single()

  if (!corpo?.payment) {
    // Eventos sem payload de cobrança (ex.: assinatura) ficam só no log.
    if (log) await supabase.from('webhook_logs').update({ processado: true }).eq('id', log.id)
    return NextResponse.json({ ok: true })
  }

  try {
    const pagamento = corpo.payment as AsaasPayment & { externalReference?: string }

    // Cobranças criadas pelo Master carregam o id do contrato em
    // externalReference; as geradas pela recorrência chegam só com a assinatura.
    const referencia = pagamento.externalReference ?? null
    let contrato = /^[0-9a-f-]{36}$/i.test(referencia ?? '') ? referencia : null

    if (!contrato && pagamento.subscription) {
      const { data: daAssinatura } = await supabase
        .from('assinaturas')
        .select('contrato_id')
        .eq('asaas_subscription_id', pagamento.subscription)
        .maybeSingle()
      contrato = daAssinatura?.contrato_id ?? null
    }

    if (!contrato) {
      throw new Error(
        `cobrança ${pagamento.id} sem contrato correspondente (externalReference/subscription)`,
      )
    }

    const { data: assinatura } = pagamento.subscription
      ? await supabase
          .from('assinaturas')
          .select('id')
          .eq('asaas_subscription_id', pagamento.subscription)
          .maybeSingle()
      : { data: null }

    const status = statusLocal(pagamento.status)
    const pagoEm =
      status === 'paga'
        ? (pagamento.paymentDate ?? pagamento.clientPaymentDate ?? new Date().toISOString())
        : null

    const registro = {
      contrato_id: contrato,
      assinatura_id: assinatura?.id ?? null,
      asaas_payment_id: pagamento.id,
      valor_centavos: asaasParaCentavos(pagamento.value),
      vencimento: pagamento.dueDate,
      forma: pagamento.billingType,
      url_fatura: pagamento.invoiceUrl ?? null,
      parcela: pagamento.installmentNumber ?? null,
      ...(status ? { status } : {}),
      ...(pagoEm ? { pago_em: pagoEm } : {}),
    }

    const { error } = await supabase
      .from('cobrancas')
      .upsert(registro, { onConflict: 'asaas_payment_id' })
    if (error) throw error

    if (log) await supabase.from('webhook_logs').update({ processado: true }).eq('id', log.id)
    return NextResponse.json({ ok: true })
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro)
    if (log) await supabase.from('webhook_logs').update({ erro: mensagem }).eq('id', log.id)
    console.error('[webhook asaas]', mensagem)
    // 200 evita reentrega infinita: o erro fica registrado para reprocesso manual.
    return NextResponse.json({ ok: false, erro: mensagem })
  }
}

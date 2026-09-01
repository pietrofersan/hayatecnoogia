import { NextResponse } from 'next/server'
import { cronAutorizado } from '@/lib/cron'
import type { DominioRadar } from '@/lib/db'
import { notificarInterno } from '@/lib/notificacoes'
import { reconsultarRadar } from '@/lib/radar'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Cron diário do Módulo 2: reconsulta por RDAP todos os domínios ativos do
 * radar e avisa quando algum muda de estado. O aviso que importa é
 * "registrado → livre": é a janela para registrar um domínio que a HAYA
 * queria e estava ocupado.
 */
export async function GET(request: Request) {
  if (!cronAutorizado(request)) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const { data } = await supabase
    .from('dominios_radar')
    .select('id, dominio, estado')
    .eq('ativo', true)
    .order('checado_em', { ascending: true, nullsFirst: true })
    .limit(200)

  const mudancas = await reconsultarRadar(supabase, (data ?? []) as DominioRadar[])
  const liberados = mudancas.filter((m) => m.para === 'livre')

  if (liberados.length > 0) {
    await notificarInterno(
      `Radar: ${liberados.length} domínio(s) ficaram livres`,
      liberados
        .map((m) => `${m.dominio} — estava ${m.de}, agora está livre.`)
        .join('\n'),
    )
  }

  const outras = mudancas.filter((m) => m.para !== 'livre')
  if (outras.length > 0) {
    await notificarInterno(
      `Radar: ${outras.length} mudança(s) de estado`,
      outras.map((m) => `${m.dominio}: ${m.de} → ${m.para}`).join('\n'),
    )
  }

  return NextResponse.json({
    checados: data?.length ?? 0,
    mudancas: mudancas.length,
    liberados: liberados.length,
  })
}

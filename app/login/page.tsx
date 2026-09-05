import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CAMPO, PainelAcesso, Rotulo } from '@/components/PainelAcesso'
import { supabaseAdmin, supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/** A tela de acesso nunca espera pelo banco: 1,5 s e a faixa some. */
function comPrazo<T>(promessa: Promise<T>, ms = 1500): Promise<T | null> {
  return Promise.race([
    promessa,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

/**
 * Números da coluna da marca. São reais: contagem de palavras medidas,
 * segmentos ativos e horário da última checagem do radar. Se o banco não
 * responder (ou a env de serviço faltar), a faixa some — nunca inventamos.
 */
async function metricas() {
  try {
    const db = supabaseAdmin()
    const resultado = await comPrazo(
      Promise.all([
        db.from('palavras_chave').select('id', { count: 'exact', head: true }),
        db.from('segmentos').select('id', { count: 'exact', head: true }),
        db
          .from('dominios_radar')
          .select('checado_em')
          .not('checado_em', 'is', null)
          .order('checado_em', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]),
    )
    if (!resultado) return undefined
    const [palavras, segmentos, ultima] = resultado

    const hora = ultima.data?.checado_em
      ? new Date(ultima.data.checado_em).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo',
        })
      : null

    const lista = [
      { valor: (palavras.count ?? 0).toLocaleString('pt-BR'), rotulo: 'palavras medidas' },
      { valor: String(segmentos.count ?? 0), rotulo: 'segmentos ativos' },
    ]
    if (hora) lista.push({ valor: hora, rotulo: 'última coleta' })
    return lista
  } catch {
    return undefined
  }
}

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string; erro?: string }>
}) {
  const { proximo = '/dashboard', erro } = await searchParams

  async function entrar(formData: FormData) {
    'use server'
    const supabase = await supabaseServidor()
    const { error } = await supabase.auth.signInWithPassword({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('senha') ?? ''),
    })
    const destino = String(formData.get('proximo') || '/dashboard')
    if (error) redirect(`/login?erro=1&proximo=${encodeURIComponent(destino)}`)
    redirect(destino)
  }

  return (
    <PainelAcesso metricas={await metricas()}>
      <p className="font-mono text-[10px] tracking-[0.34em] text-ciano uppercase">
        Acesso restrito
      </p>
      <h2 className="mt-3 text-[21px] font-semibold text-pleno">Entrar no painel</h2>

      <form action={entrar} className="mt-7">
        <input type="hidden" name="proximo" value={proximo} />

        <label className="block">
          <Rotulo>E-mail</Rotulo>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={CAMPO}
          />
        </label>

        <label className="mt-4 block">
          <Rotulo>Senha</Rotulo>
          <input
            name="senha"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            className={CAMPO}
          />
        </label>

        <div className="mt-4 flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[11.5px] text-suave">
            <input
              type="checkbox"
              name="manter"
              defaultChecked
              className="size-3.5 accent-ciano"
            />
            Manter conectado
          </label>
          <Link
            href="/login?recuperar=1"
            className="text-[11.5px] text-tenue hover:text-corpo"
          >
            Esqueci a senha
          </Link>
        </div>

        {erro && (
          <p
            role="alert"
            className="mt-4 rounded-ctrl border border-magenta/40 bg-magenta/10 px-3 py-2 text-[11.5px] text-magenta-claro"
          >
            ! Não foi possível entrar. Verifique e-mail e senha.
          </p>
        )}

        <button className="mt-6 min-h-[52px] w-full cursor-pointer rounded-btn bg-linear-to-r from-ciano to-azul text-[13px] font-semibold text-abismo shadow-glow-ciano transition hover:brightness-110 md:min-h-[46px]">
          Entrar
        </button>
      </form>

      <p className="mt-8 font-mono text-[10px] leading-relaxed text-fantasma">
        Sessão registrada em webhook_logs · 2FA obrigatório para perfis admin.
      </p>
    </PainelAcesso>
  )
}

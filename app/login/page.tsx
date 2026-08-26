import { redirect } from 'next/navigation'
import { supabaseServidor } from '@/lib/supabase'

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
    <div className="flex min-h-screen items-center justify-center px-6">
      <form
        action={entrar}
        className="w-full max-w-sm rounded-xl border border-linha bg-painel p-8"
      >
        <p className="text-sm font-semibold tracking-[0.2em] text-marfim">HAYA</p>
        <p className="mb-8 text-[10px] tracking-[0.3em] text-apagado uppercase">
          Master
        </p>

        <input type="hidden" name="proximo" value={proximo} />

        <label className="mb-1 block text-[11px] tracking-wide text-nevoa uppercase">
          E-mail
        </label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mb-4 w-full rounded-lg border border-linha bg-noite px-3 py-2 text-sm text-marfim outline-none focus:border-tec"
        />

        <label className="mb-1 block text-[11px] tracking-wide text-nevoa uppercase">
          Senha
        </label>
        <input
          name="senha"
          type="password"
          required
          autoComplete="current-password"
          className="mb-6 w-full rounded-lg border border-linha bg-noite px-3 py-2 text-sm text-marfim outline-none focus:border-tec"
        />

        {erro && (
          <p className="mb-4 text-xs text-critico">
            ! Não foi possível entrar. Verifique e-mail e senha.
          </p>
        )}

        <button className="w-full rounded-lg bg-tec py-2 text-sm font-medium text-noite transition-opacity hover:opacity-90">
          Entrar
        </button>
      </form>
    </div>
  )
}

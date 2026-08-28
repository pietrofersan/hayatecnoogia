import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLICAS = ['/login', '/sem-acesso', '/api/leads', '/api/webhooks', '/api/cron']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLICAS.some((p) => pathname.startsWith(p))) return NextResponse.next()

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista: { name: string; value: string; options: CookieOptions }[]) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          lista.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const login = request.nextUrl.clone()
    login.pathname = '/login'
    login.searchParams.set('proximo', pathname)
    return NextResponse.redirect(login)
  }

  // Estar autenticado no projeto não basta: o mesmo Supabase hospeda os
  // usuários finais de outros apps (HAYA APP). Só quem está em
  // usuarios_master enxerga o Master — a policy usuarios_master_le_proprio
  // permite essa leitura da própria linha mesmo para quem não é membro.
  const { data: membro } = await supabase
    .from('usuarios_master')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!membro) {
    const semAcesso = request.nextUrl.clone()
    semAcesso.pathname = '/sem-acesso'
    return NextResponse.redirect(semAcesso)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)'],
}

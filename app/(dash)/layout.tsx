import { Nav } from '@/components/Nav'
import { supabaseServidor } from '@/lib/supabase'

export default async function DashLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await supabaseServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col justify-between border-r border-linha bg-painel px-4 py-6 md:flex">
        <div>
          <div className="mb-8 px-3">
            <p className="text-sm font-semibold tracking-[0.2em] text-marfim">
              HAYA
            </p>
            <p className="text-[10px] tracking-[0.3em] text-apagado uppercase">
              Master
            </p>
          </div>
          <Nav />
        </div>
        <div className="px-3">
          <p className="truncate text-[11px] text-apagado">{user?.email}</p>
          <form action="/auth/sair" method="post">
            <button className="mt-1 text-[11px] text-nevoa hover:text-marfim">
              Sair
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden px-6 py-8 md:px-8">{children}</main>
    </div>
  )
}

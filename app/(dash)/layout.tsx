import { BarraInferior, Nav } from '@/components/Nav'
import { Logo } from '@/components/Logo'
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
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar de 250px — vidro sobre o abismo, só a partir de 768px. */}
      <aside className="hidden w-[250px] shrink-0 flex-col justify-between gap-6 border-r border-borda bg-linear-to-b from-[rgba(14,20,38,.85)] to-[rgba(6,9,20,.85)] px-4 pt-[22px] pb-[18px] backdrop-blur-[22px] md:sticky md:top-0 md:flex md:h-screen md:overflow-y-auto">
        <div>
          <div className="border-b border-borda px-1.5 pb-[18px]">
            <Logo largura={168} />
            <p className="mt-2 font-mono text-[9px] tracking-[0.32em] text-fantasma uppercase">
              Intelligence
            </p>
          </div>
          <div className="mt-4">
            <Nav />
          </div>
        </div>

        <div className="rounded-card border border-borda bg-white/[0.03] px-3 py-2.5">
          <p className="truncate font-mono text-[10.5px] text-mono">{user?.email}</p>
          <form action="/auth/sair" method="post">
            <button className="mt-1 cursor-pointer text-[11px] text-tenue hover:text-corpo">
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Chrome mobile: logo reduzida no topo. */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-borda bg-vidro-chrome px-5 py-3 backdrop-blur-[22px] md:hidden">
          <Logo largura={124} />
          <form action="/auth/sair" method="post">
            <button className="cursor-pointer font-mono text-[10px] tracking-[0.2em] text-tenue uppercase">
              Sair
            </button>
          </form>
        </header>

        <main className="animate-entrada min-w-0 flex-1 px-5 py-6 md:px-[26px] md:py-[26px]">
          {children}
        </main>

        <BarraInferior />
      </div>
    </div>
  )
}

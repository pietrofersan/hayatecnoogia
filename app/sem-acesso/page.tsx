export default function SemAcesso() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-linha bg-painel p-8 text-center">
        <p className="text-sm font-semibold tracking-[0.2em] text-marfim">HAYA</p>
        <p className="mb-8 text-[10px] tracking-[0.3em] text-apagado uppercase">
          Master
        </p>

        <p className="text-sm text-ink-2">
          Sua conta está autenticada, mas não faz parte da equipe do Master.
        </p>
        <p className="mt-2 text-xs text-apagado">
          Peça a um admin para te cadastrar em <code>usuarios_master</code>.
        </p>

        <form action="/auth/sair" method="post" className="mt-6">
          <button className="text-xs text-nevoa hover:text-marfim">
            Sair e tentar com outra conta
          </button>
        </form>
      </div>
    </div>
  )
}

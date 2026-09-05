import { PainelAcesso } from '@/components/PainelAcesso'

export default function SemAcesso() {
  return (
    <PainelAcesso>
      <p className="font-mono text-[10px] tracking-[0.34em] text-ambar uppercase">
        Sem acesso
      </p>
      <h2 className="mt-3 text-[21px] font-semibold text-pleno">
        Conta fora da equipe do Master
      </h2>

      <p className="mt-5 text-[13px] leading-relaxed text-corpo">
        Sua conta está autenticada, mas não faz parte da equipe do Master.
      </p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-tenue">
        Peça a um admin para te cadastrar em{' '}
        <code className="font-mono text-mono">usuarios_master</code>.
      </p>

      <form action="/auth/sair" method="post" className="mt-7">
        <button className="cursor-pointer text-[12.5px] text-suave hover:text-pleno">
          Sair e tentar com outra conta
        </button>
      </form>
    </PainelAcesso>
  )
}

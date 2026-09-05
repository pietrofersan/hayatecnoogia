import type { ReactNode } from 'react'
import { Logo } from './Logo'

/**
 * Composição das telas de acesso (README §9): painel único `1.05fr .95fr`,
 * mínimo de 680px. À esquerda a marca; à direita o conteúdo variável
 * (entrar, sem acesso). No mobile vira uma coluna só.
 */
export function PainelAcesso({
  metricas,
  children,
}: {
  metricas?: { valor: string; rotulo: string }[]
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-5 md:p-8">
      <div className="grid w-full max-w-[1080px] overflow-hidden rounded-painel border border-borda bg-vidro shadow-painel backdrop-blur-[18px] md:min-h-[680px] md:grid-cols-[1.05fr_0.95fr]">
        {/* Lado da marca */}
        <div className="relative flex flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,#4C6FFF_0%,#A855F7_52%,#070B16_100%)] p-8 md:p-11">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
              maskImage:
                'radial-gradient(620px 520px at 30% 20%, #000 0%, transparent 72%)',
              WebkitMaskImage:
                'radial-gradient(620px 520px at 30% 20%, #000 0%, transparent 72%)',
            }}
          />
          <div className="relative">
            <Logo largura={210} />
          </div>
          <h1 className="relative mt-10 max-w-[24ch] text-[22px] leading-[1.25] font-semibold text-white md:text-[27px]">
            A camada de inteligência que mede o mercado antes de escrever uma linha.
          </h1>
          {metricas && metricas.length > 0 && (
            <dl className="relative mt-10 flex flex-wrap gap-x-8 gap-y-4">
              {metricas.map((m) => (
                <div key={m.rotulo}>
                  <dd className="font-mono text-[19px] font-semibold text-white">
                    {m.valor}
                  </dd>
                  <dt className="mt-1 font-mono text-[9.5px] tracking-[0.2em] text-white/60 uppercase">
                    {m.rotulo}
                  </dt>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Lado do formulário */}
        <div className="flex flex-col justify-center p-8 md:p-11">{children}</div>
      </div>
    </div>
  )
}

export const CAMPO =
  'w-full rounded-[13px] border border-borda-forte bg-[rgba(10,15,30,.72)] px-3.5 py-3 text-[13px] text-pleno outline-none transition focus:border-ciano focus:shadow-[0_0_0_3px_rgba(34,211,238,.12)] md:py-2.5'

export function Rotulo({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block font-mono text-[9.5px] tracking-[0.2em] text-fantasma uppercase">
      {children}
    </span>
  )
}

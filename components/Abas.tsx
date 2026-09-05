import Link from 'next/link'
import { cn } from './cn'

export type Aba = { chave: string; rotulo: string; href: string }

/**
 * Abas com sublinhado ciano de 2px (README §3). No mobile viram pílulas
 * com scroll horizontal — mesma navegação, alvo de toque de 44px.
 */
export function Abas({ abas, ativa }: { abas: Aba[]; ativa: string }) {
  return (
    <nav className="-mx-1 overflow-x-auto px-1">
      <ul className="flex min-w-max items-center gap-1 border-b border-borda">
        {abas.map((a) => {
          const on = a.chave === ativa
          return (
            <li key={a.chave}>
              <Link
                href={a.href}
                scroll={false}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-[44px] items-center border-b-2 px-3.5 text-[12.5px] transition-colors',
                  on
                    ? 'border-ciano text-pleno'
                    : 'border-transparent text-fraco hover:text-corpo',
                )}
              >
                {a.rotulo}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

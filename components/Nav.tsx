'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from './cn'

type Item = { href: string; rotulo: string; icone: string }

const GRUPOS: { grupo: string; itens: Item[] }[] = [
  {
    grupo: 'Operação',
    itens: [
      { href: '/dashboard', rotulo: 'Dashboard', icone: '◈' },
      { href: '/alertas', rotulo: 'Alertas', icone: '✦' },
      { href: '/segmentos', rotulo: 'Segmentos', icone: '⌗' },
      { href: '/clientes', rotulo: 'Clientes', icone: '◍' },
      { href: '/dominios', rotulo: 'Domínios', icone: '◎' },
      { href: '/leads', rotulo: 'Leads', icone: '◆' },
      { href: '/crm', rotulo: 'CRM', icone: '✉' },
    ],
  },
  {
    grupo: 'Receita',
    itens: [
      { href: '/contratos', rotulo: 'Contratos', icone: '▤' },
      { href: '/cobrancas', rotulo: 'Cobranças', icone: '◫' },
      { href: '/relatorio', rotulo: 'Relatório', icone: '▦' },
    ],
  },
  {
    grupo: 'Sistema',
    itens: [
      { href: '/integracoes', rotulo: 'Integrações', icone: '◇' },
      { href: '/usuarios', rotulo: 'Usuários', icone: '⏻' },
      { href: '/config', rotulo: 'Config', icone: '⚙' },
    ],
  },
]

/** A rota mais específica vence: /clientes não acende com /clientes/onboarding? acende — é o mesmo módulo. */
function ativo(caminho: string, href: string) {
  return caminho === href || caminho.startsWith(href + '/')
}

export function Nav() {
  const caminho = usePathname()

  return (
    <div className="flex flex-col gap-4">
      {GRUPOS.map(({ grupo, itens }) => (
        <div key={grupo}>
          <p className="mx-1.5 mb-2 font-mono text-[9px] font-medium tracking-[0.24em] text-abissal uppercase">
            {grupo}
          </p>
          <nav className="flex flex-col gap-[3px]">
            {itens.map((item) => {
              const on = ativo(caminho, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={on ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-[11px] rounded-ctrl px-3 py-2.5 text-[13.5px] transition-colors',
                    on
                      ? 'bg-linear-to-r from-azul/20 to-azul/[0.04] text-corpo shadow-nav-ativo'
                      : 'text-fraco hover:text-corpo',
                  )}
                >
                  <span aria-hidden className="w-4 text-center text-[12px]">
                    {item.icone}
                  </span>
                  {item.rotulo}
                </Link>
              )
            })}
          </nav>
        </div>
      ))}
    </div>
  )
}

const BARRA: Item[] = [
  { href: '/dashboard', rotulo: 'Hoje', icone: '◈' },
  { href: '/segmentos', rotulo: 'Segmentos', icone: '⌗' },
  { href: '/clientes', rotulo: 'Clientes', icone: '◍' },
  { href: '/crm', rotulo: 'CRM', icone: '✉' },
  { href: '/alertas', rotulo: 'Alertas', icone: '✦' },
]

const DESTAQUE = 2

/** Barra inferior de 5 posições, alvos de 52px — só abaixo de 768px. */
export function BarraInferior() {
  const caminho = usePathname()

  return (
    <div className="sticky bottom-0 z-20 px-4 pt-2.5 pb-[18px] md:hidden">
      <div className="grid grid-cols-5 items-center rounded-barra border border-borda-forte/60 bg-vidro-chrome px-2 py-[9px] shadow-barra-mobile backdrop-blur-[22px]">
        {BARRA.map((item, i) => {
          const on = ativo(caminho, item.href)
          if (i === DESTAQUE) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.rotulo}
                aria-current={on ? 'page' : undefined}
                className="flex min-h-[52px] flex-col items-center justify-center"
              >
                <span
                  aria-hidden
                  className="grid size-11 place-items-center rounded-[16px] bg-linear-to-br from-ciano via-azul to-roxo text-[17px] text-abismo shadow-[0_0_30px_rgba(76,111,255,.65)]"
                >
                  {item.icone}
                </span>
              </Link>
            )
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'flex min-h-[52px] flex-col items-center justify-center gap-[5px] rounded-[16px]',
                on ? 'bg-azul/15 text-corpo shadow-glow-azul' : 'text-tenue',
              )}
            >
              <span aria-hidden className="text-[16px]">
                {item.icone}
              </span>
              <span className="font-mono text-[9px] font-medium">{item.rotulo}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITENS = [
  { href: '/dashboard', rotulo: 'Dashboard', icone: '◧' },
  { href: '/clientes', rotulo: 'Clientes', icone: '◍' },
  { href: '/contratos', rotulo: 'Contratos', icone: '▤' },
  { href: '/cobrancas', rotulo: 'Cobranças', icone: '◈' },
  { href: '/leads', rotulo: 'Leads', icone: '◆' },
  { href: '/config', rotulo: 'Config', icone: '⚙' },
] as const

export function Nav() {
  const caminho = usePathname()

  return (
    <nav className="flex flex-col gap-0.5">
      {ITENS.map((item) => {
        const ativo = caminho.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              ativo
                ? 'bg-linha text-marfim'
                : 'text-nevoa hover:bg-linha/50 hover:text-ink-2'
            }`}
          >
            <span aria-hidden className="w-4 text-center text-xs">
              {item.icone}
            </span>
            {item.rotulo}
          </Link>
        )
      })}
    </nav>
  )
}

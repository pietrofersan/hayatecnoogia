'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function CrmSubNavLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  const caminho = usePathname()
  const ativo = caminho.startsWith(href)

  return (
    <Link
      href={href}
      aria-current={ativo ? 'page' : undefined}
      className={`inline-flex min-h-[44px] items-center border-b-2 px-3.5 text-[12.5px] transition-colors ${
        ativo ? 'border-ciano text-pleno' : 'border-transparent text-fraco hover:text-corpo'
      }`}
    >
      {children}
    </Link>
  )
}

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
      className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
        ativo
          ? 'bg-borda text-pleno'
          : 'text-suave hover:text-corpo'
      }`}
    >
      {children}
    </Link>
  )
}

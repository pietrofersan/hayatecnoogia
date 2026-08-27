'use client'

import { useEffect, type ReactNode } from 'react'

/**
 * Sobreposição simples para os formulários. Sem ela os formulários abrem
 * dentro do cabeçalho e ficam espremidos na coluna do botão.
 */
export function Modal({
  titulo,
  aoFechar,
  children,
}: {
  titulo: string
  aoFechar: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowAnterior
    }
  }, [aoFechar])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-noite/80 p-4 backdrop-blur-sm sm:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) aoFechar()
      }}
      role="dialog"
      aria-modal
      aria-label={titulo}
    >
      <div className="my-auto w-full max-w-3xl rounded-xl border border-linha bg-painel">
        <header className="flex items-center justify-between border-b border-linha px-5 py-4">
          <h2 className="text-[13px] font-medium tracking-wide text-ink-2 uppercase">
            {titulo}
          </h2>
          <button
            onClick={aoFechar}
            className="text-sm text-apagado hover:text-marfim"
            aria-label="Fechar"
          >
            ×
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

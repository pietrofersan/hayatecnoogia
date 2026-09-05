import type { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from './cn'

export type Cabecalho =
  | ReactNode
  | {
      rotulo: ReactNode
      /** quando presente, o cabeçalho vira link de ordenação */
      href?: string
      ordem?: 'asc' | 'desc' | null
      numerica?: boolean
    }

function ehColuna(c: Cabecalho): c is Exclude<Cabecalho, ReactNode> {
  return typeof c === 'object' && c !== null && 'rotulo' in c
}

const SETA = { asc: '↑', desc: '↓' } as const

export function Tabela({
  cabecalho,
  children,
  minima = '40rem',
}: {
  cabecalho: Cabecalho[]
  children: ReactNode
  minima?: string
}) {
  return (
    <div className="-mx-[22px] overflow-x-auto px-[22px]">
      <table
        className="w-full border-collapse text-[12.5px]"
        style={{ minWidth: minima }}
      >
        <thead>
          <tr className="border-b border-borda">
            {cabecalho.map((c, i) => {
              const col = ehColuna(c) ? c : { rotulo: c as ReactNode }
              const classe = cn(
                'px-2.5 py-2 font-mono text-[9.5px] font-medium tracking-[0.16em] text-fantasma uppercase first:pl-0 last:pr-0',
                col.numerica ? 'text-right' : 'text-left',
              )
              return (
                <th key={i} scope="col" className={classe}>
                  {col.href ? (
                    <Link
                      href={col.href}
                      className="inline-flex items-center gap-1 hover:text-suave"
                      aria-sort={
                        col.ordem
                          ? col.ordem === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      {col.rotulo}
                      <span aria-hidden>{col.ordem ? SETA[col.ordem] : '↕'}</span>
                    </Link>
                  ) : (
                    col.rotulo
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Linha({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-azul/[0.07] last:border-0 hover:bg-azul/[0.07]">
      {children}
    </tr>
  )
}

export function Celula({
  children,
  numerica,
  mono,
  className,
}: {
  children: ReactNode
  numerica?: boolean
  mono?: boolean
  className?: string
}) {
  return (
    <td
      className={cn(
        'px-2.5 py-[11px] text-corpo first:pl-0 last:pr-0',
        numerica && 'tabular text-right',
        mono && 'font-mono text-[11.5px] text-mono',
        className,
      )}
    >
      {children}
    </td>
  )
}

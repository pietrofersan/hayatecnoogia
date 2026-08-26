import type { ReactNode } from 'react'

export function Tabela({
  cabecalho,
  children,
}: {
  cabecalho: ReactNode[]
  children: ReactNode
}) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-linha">
            {cabecalho.map((c, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left text-[11px] font-medium tracking-[0.06em] text-nevoa uppercase first:pl-0 last:pr-0"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Linha({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-linha/60 last:border-0 hover:bg-linha/30">
      {children}
    </tr>
  )
}

export function Celula({
  children,
  numerica,
}: {
  children: ReactNode
  numerica?: boolean
}) {
  return (
    <td
      className={`px-3 py-2.5 text-ink-2 first:pl-0 last:pr-0 ${
        numerica ? 'tabular text-right' : ''
      }`}
    >
      {children}
    </td>
  )
}

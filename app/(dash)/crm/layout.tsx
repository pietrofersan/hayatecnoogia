import { CabecalhoTela } from '@/components/CabecalhoTela'
import { CrmSubNavLink } from '@/components/CrmSubNavLink'

const ABAS = [
  { href: '/crm/inbox', rotulo: 'Conversas' },
  { href: '/crm/contatos', rotulo: 'Contatos' },
  { href: '/crm/funil', rotulo: 'Funil' },
] as const

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3.5">
      <CabecalhoTela
        titulo="CRM · OmniCRM"
        meta="WhatsApp, Instagram, Facebook e Mercado Livre num inbox só · SLA de resposta de 1 h"
      />

      <nav className="-mx-1 overflow-x-auto px-1">
        <ul className="flex min-w-max items-center gap-1 border-b border-borda">
          {ABAS.map((aba) => (
            <li key={aba.href}>
              <CrmSubNavLink href={aba.href}>{aba.rotulo}</CrmSubNavLink>
            </li>
          ))}
        </ul>
      </nav>

      {children}
    </div>
  )
}

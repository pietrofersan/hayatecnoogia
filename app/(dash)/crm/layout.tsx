import { CrmSubNavLink } from '@/components/CrmSubNavLink'

const ABAS = [
  { href: '/crm/inbox', rotulo: 'Conversas' },
  { href: '/crm/contatos', rotulo: 'Contatos' },
  { href: '/crm/funil', rotulo: 'Funil' },
] as const

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-pleno">CRM</h1>
          <p className="text-sm text-tenue">
            WhatsApp, Instagram, Facebook e Mercado Livre num inbox só.
          </p>
        </div>
        <nav className="flex gap-1 rounded-lg border border-borda bg-vidro p-1">
          {ABAS.map((aba) => (
            <CrmSubNavLink key={aba.href} href={aba.href}>
              {aba.rotulo}
            </CrmSubNavLink>
          ))}
        </nav>
      </header>
      {children}
    </div>
  )
}

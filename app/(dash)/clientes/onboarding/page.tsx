import { CabecalhoTela } from '@/components/CabecalhoTela'
import { BotaoLink } from '@/components/Campo'
import { WizardOnboarding } from '@/components/WizardOnboarding'

export const metadata = { title: 'Onboarding de cliente · HAYA Intelligence' }

export default function Onboarding() {
  return (
    <div className="space-y-3.5">
      <CabecalhoTela
        titulo="Onboarding de cliente"
        meta="Cinco passos até o cliente entrar na carteira — nada é cobrado sem passar pela tela de contratos"
        acoes={<BotaoLink href="/clientes">Voltar à carteira</BotaoLink>}
      />
      <WizardOnboarding />
    </div>
  )
}

import { BotaoChecarRadar } from '@/components/BotaoChecarRadar'
import { FormDominio } from '@/components/FormDominio'
import { LinhaRadar } from '@/components/LinhaRadar'
import { Painel, Vazio } from '@/components/Painel'
import { Tabela } from '@/components/Tabela'
import type { Cliente, DominioRadar, EventoDominio } from '@/lib/db'
import { ROTULO_ESTADO_DOMINIO } from '@/lib/db'
import { formatData } from '@/lib/money'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type LinhaComCliente = DominioRadar & { clientes: { nome: string } | null }
type EventoComDominio = EventoDominio & { dominios_radar: { dominio: string } | null }

export default async function Dominios() {
  const supabase = await supabaseServidor()

  const [{ data: dominios }, { data: eventos }, { data: clientes }] = await Promise.all([
    supabase
      .from('dominios_radar')
      .select('*, clientes(nome)')
      .order('ativo', { ascending: false })
      .order('estado')
      .order('dominio'),
    supabase
      .from('eventos_dominio')
      .select('*, dominios_radar(dominio)')
      .order('em', { ascending: false })
      .limit(15),
    supabase.from('clientes').select('id, nome').order('nome'),
  ])

  const lista = (dominios ?? []) as unknown as LinhaComCliente[]
  const historico = (eventos ?? []) as unknown as EventoComDominio[]
  const livres = lista.filter((d) => d.ativo && d.estado === 'livre').length

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-pleno">Radar de domínios</h1>
          <p className="text-sm text-tenue">
            Acompanhamento contínuo por RDAP — o cron reconsulta todo dia às 9h e
            avisa quando um domínio fica livre.
            {livres > 0 && (
              <span className="text-verde"> {livres} livre(s) agora.</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BotaoChecarRadar />
          <FormDominio clientes={(clientes ?? []) as Pick<Cliente, 'id' | 'nome'>[]} />
        </div>
      </header>

      <Painel>
        {lista.length === 0 ? (
          <Vazio>
            Nenhum domínio no radar. Adicione os que interessam — ou marque uma
            palavra em Segmentos e mande vigiar o domínio de lá.
          </Vazio>
        ) : (
          <Tabela
            cabecalho={['Domínio', 'Estado', 'Expira', 'Registrador', 'Checado', '']}
          >
            {lista.map((d) => (
              <LinhaRadar key={d.id} dominio={d} cliente={d.clientes?.nome ?? null} />
            ))}
          </Tabela>
        )}
      </Painel>

      {historico.length > 0 && (
        <Painel titulo="Mudanças recentes">
          <ul className="space-y-1 text-sm">
            {historico.map((e) => (
              <li key={e.id} className="flex justify-between gap-3">
                <span className="text-corpo">
                  {e.dominios_radar?.dominio ?? '—'}{' '}
                  <span className="text-tenue">
                    {e.de ? ROTULO_ESTADO_DOMINIO[e.de] : '—'} →{' '}
                  </span>
                  <span className={e.para === 'livre' ? 'text-verde' : 'text-suave'}>
                    {ROTULO_ESTADO_DOMINIO[e.para]}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-tenue">{formatData(e.em)}</span>
              </li>
            ))}
          </ul>
        </Painel>
      )}
    </div>
  )
}

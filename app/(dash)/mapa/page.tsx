import { BotaoLink } from '@/components/Campo'
import { CabecalhoTela } from '@/components/CabecalhoTela'
import { ChipLink } from '@/components/Chip'
import { MapaPosicionamento } from '@/components/MapaPosicionamento'
import { Painel, Vazio } from '@/components/Painel'
import type { ArestaMapa, Cliente, NoMapa } from '@/lib/db'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function Mapa({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>
}) {
  const { cliente } = await searchParams
  const supabase = await supabaseServidor()

  const { data: clientesBrutos } = await supabase
    .from('clientes')
    .select('id, nome')
    .order('nome')

  const clientes = (clientesBrutos ?? []) as Pick<Cliente, 'id' | 'nome'>[]

  // Sem cliente na URL, abre no primeiro que já tem mapa desenhado — cair
  // num cliente vazio faria a tela parecer quebrada.
  const { data: comMapa } = await supabase
    .from('mapa_nos')
    .select('cliente_id')
    .limit(200)

  const idsComMapa = new Set(
    ((comMapa ?? []) as { cliente_id: string }[]).map((n) => n.cliente_id),
  )

  const clienteId =
    cliente ?? clientes.find((c) => idsComMapa.has(c.id))?.id ?? clientes[0]?.id ?? null

  const [{ data: nosBrutos }, { data: arestasBrutas }] = clienteId
    ? await Promise.all([
        supabase.from('mapa_nos').select('*').eq('cliente_id', clienteId).order('criado_em'),
        supabase.from('mapa_arestas').select('*'),
      ])
    : [{ data: null }, { data: null }]

  const nos = (nosBrutos ?? []) as NoMapa[]
  const idsDoCliente = new Set(nos.map((n) => n.id))
  // As arestas vêm todas e são filtradas aqui: só interessa a que liga dois
  // nós deste cliente.
  const arestas = ((arestasBrutas ?? []) as ArestaMapa[]).filter(
    (a) => idsDoCliente.has(a.de) && idsDoCliente.has(a.para),
  )

  const nomeCliente = clientes.find((c) => c.id === clienteId)?.nome

  return (
    <div className="space-y-3.5">
      <CabecalhoTela
        titulo="Mapa de posicionamento"
        meta={
          nomeCliente
            ? `${nomeCliente} · ${nos.length} nó(s) · hub, satélites, canibalizações e buracos de cobertura`
            : 'Cadastre um cliente para desenhar o mapa da marca'
        }
        acoes={<BotaoLink href="/segmentos">Ver segmentos</BotaoLink>}
      />

      {clientes.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {clientes.map((c) => (
            <ChipLink
              key={c.id}
              href={`/mapa?cliente=${c.id}`}
              ativo={c.id === clienteId}
              scroll={false}
            >
              {c.nome}
              {idsComMapa.has(c.id) ? '' : ' · vazio'}
            </ChipLink>
          ))}
        </div>
      )}

      {nos.length === 0 ? (
        <Painel>
          <Vazio
            descricao={
              clientes.length === 0
                ? 'O mapa é desenhado por cliente — cadastre o primeiro para começar.'
                : 'Este cliente ainda não tem mapa. Os nós vêm da pesquisa de segmento: hub da marca, subdomínios, landings, satélites, e as palavras que ninguém cobre.'
            }
            acao={
              clientes.length === 0 ? (
                <BotaoLink href="/clientes/onboarding" variante="primario">
                  Cadastrar cliente
                </BotaoLink>
              ) : undefined
            }
          >
            {clientes.length === 0 ? 'Nenhum cliente cadastrado' : 'Mapa ainda não desenhado'}
          </Vazio>
        </Painel>
      ) : (
        <MapaPosicionamento nos={nos} arestas={arestas} />
      )}
    </div>
  )
}

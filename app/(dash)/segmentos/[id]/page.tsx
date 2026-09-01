import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BotaoExpandir } from '@/components/BotaoExpandir'
import { LigarCliente } from '@/components/LigarCliente'
import { LinhaPalavra } from '@/components/LinhaPalavra'
import { Painel, Vazio } from '@/components/Painel'
import { Tabela } from '@/components/Tabela'
import type { ChecagemDominio, Cliente, PalavraChave, Segmento } from '@/lib/db'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function SegmentoDetalhe({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await supabaseServidor()

  const [{ data: segmento }, { data: palavras }, { data: clientes }] = await Promise.all([
    supabase.from('segmentos').select('*, clientes(id, nome)').eq('id', id).single(),
    supabase
      .from('palavras_chave')
      .select('*, checagens_dominio(*)')
      .eq('segmento_id', id)
      .order('interessante', { ascending: false })
      .order('termo'),
    supabase.from('clientes').select('id, nome').order('nome'),
  ])

  if (!segmento) notFound()
  const s = segmento as unknown as Segmento & { clientes: { id: string; nome: string } | null }
  const listaPalavras = (palavras ?? []) as unknown as (PalavraChave & {
    checagens_dominio: ChecagemDominio[]
  })[]

  return (
    <div className="space-y-6">
      <header>
        <Link href="/segmentos" className="text-xs text-apagado hover:text-ink-2">
          ← Segmentos
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-marfim">{s.nome}</h1>
            <p className="text-sm text-apagado">
              {s.clientes ? (
                <>
                  Ligado a{' '}
                  <Link href={`/clientes/${s.clientes.id}`} className="text-tec hover:underline">
                    {s.clientes.nome}
                  </Link>
                </>
              ) : (
                'Prospecção livre — sem cliente ainda'
              )}
              {' · '}
              {listaPalavras.length} palavra(s)
            </p>
          </div>
          <BotaoExpandir segmentoId={s.id} />
        </div>
      </header>

      {!s.clientes && (
        <Painel titulo="Virar projeto de cliente">
          <LigarCliente
            segmentoId={s.id}
            clientes={(clientes ?? []) as Pick<Cliente, 'id' | 'nome'>[]}
          />
        </Painel>
      )}

      <Painel>
        {listaPalavras.length === 0 ? (
          <Vazio>
            Nenhuma palavra ainda. Clique em &ldquo;Expandir com IA&rdquo; para gerar as
            primeiras — precisa de <code className="text-nevoa">GEMINI_API_KEY</code>{' '}
            configurada.
          </Vazio>
        ) : (
          <Tabela cabecalho={['', 'Termo', 'Tendência', 'Volume', 'Domínio']}>
            {listaPalavras.map((p) => (
              <LinhaPalavra key={p.id} palavra={p} checagens={p.checagens_dominio ?? []} />
            ))}
          </Tabela>
        )}
      </Painel>

      <p className="text-[11px] text-apagado">
        Tendência e volume aguardam a aprovação do Keyword Planner e do Google Trends
        (compilado geral, Parte 3.2 e 3.5) — a checagem de domínio já é real, via RDAP.
      </p>
    </div>
  )
}

import Link from 'next/link'
import { FormSegmento } from '@/components/FormSegmento'
import { Painel, Vazio } from '@/components/Painel'
import { Celula, Linha, Tabela } from '@/components/Tabela'
import type { Cliente, Segmento } from '@/lib/db'
import { formatData } from '@/lib/money'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type SegmentoComContagem = Segmento & {
  clientes: { nome: string } | null
  palavras_chave: { count: number }[]
}

export default async function Segmentos() {
  const supabase = await supabaseServidor()

  const [{ data }, { data: clientes }] = await Promise.all([
    supabase
      .from('segmentos')
      .select('*, clientes(nome), palavras_chave(count)')
      .order('criado_em', { ascending: false }),
    supabase.from('clientes').select('id, nome').order('nome'),
  ])

  const segmentos = (data ?? []) as unknown as SegmentoComContagem[]

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-pleno">Segmentos</h1>
          <p className="text-sm text-tenue">
            Pesquisa de mercado por segmento ou por cliente — Módulo 1.
          </p>
        </div>
        <FormSegmento
          clientes={(clientes ?? []) as Pick<Cliente, 'id' | 'nome'>[]}
        />
      </header>

      <Painel>
        {segmentos.length === 0 ? (
          <Vazio>
            Nenhum segmento ainda. Comece por um que você já conhece — a
            Parte 11 do compilado sugere validar antes de automatizar.
          </Vazio>
        ) : (
          <Tabela cabecalho={['Nome', 'Cliente', 'Palavras', 'Criado']}>
            {segmentos.map((s) => (
              <Linha key={s.id}>
                <Celula>
                  <Link href={`/segmentos/${s.id}`} className="text-pleno hover:text-azul">
                    {s.nome}
                  </Link>
                </Celula>
                <Celula>
                  {s.clientes?.nome ?? (
                    <span className="text-tenue">— prospecção —</span>
                  )}
                </Celula>
                <Celula numerica>{s.palavras_chave?.[0]?.count ?? 0}</Celula>
                <Celula>{formatData(s.criado_em)}</Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Painel>
    </div>
  )
}

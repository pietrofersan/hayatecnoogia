import Link from 'next/link'
import { FormCliente } from '@/components/FormCliente'
import { Painel, Vazio } from '@/components/Painel'
import { Celula, Linha, Tabela } from '@/components/Tabela'
import type { Cliente } from '@/lib/db'
import { formatData } from '@/lib/money'
import { formataDocumento } from '@/lib/validacao'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function Clientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await supabaseServidor()

  let consulta = supabase.from('clientes').select('*').order('nome')
  if (q) consulta = consulta.ilike('nome', `%${q}%`)
  const { data } = await consulta
  const clientes = (data ?? []) as Cliente[]

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-pleno">Clientes</h1>
          <p className="text-sm text-tenue">
            {clientes.length} cadastrado(s) · espelhados no Asaas
          </p>
        </div>
        <FormCliente />
      </header>

      <form className="max-w-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome…"
          className="w-full rounded-lg border border-borda bg-vidro px-3 py-2 text-sm text-pleno outline-none placeholder:text-tenue focus:border-azul"
        />
      </form>

      <Painel>
        {clientes.length === 0 ? (
          <Vazio>Nenhum cliente encontrado.</Vazio>
        ) : (
          <Tabela cabecalho={['Nome', 'Documento', 'Contato', 'Asaas', 'Cadastro']}>
            {clientes.map((c) => (
              <Linha key={c.id}>
                <Celula>
                  <Link
                    href={`/clientes/${c.id}`}
                    className="text-pleno hover:text-azul"
                  >
                    {c.nome}
                  </Link>
                  {c.nome_fantasia && (
                    <span className="block text-xs text-tenue">{c.nome_fantasia}</span>
                  )}
                </Celula>
                <Celula>{formataDocumento(c.documento)}</Celula>
                <Celula>{c.email ?? c.whatsapp ?? c.telefone ?? '—'}</Celula>
                <Celula>
                  {c.asaas_customer_id ? (
                    <span className="text-verde">✓ espelhado</span>
                  ) : (
                    <span className="text-ambar">! pendente</span>
                  )}
                </Celula>
                <Celula>{formatData(c.criado_em)}</Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Painel>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ligarSegmentoAoCliente } from '@/lib/acoes'
import type { Cliente } from '@/lib/db'
import { Botao, Selecao } from './Campo'

/** "Transformar segmento em projeto de cliente" — Parte 16, tela 3. */
export function LigarCliente({
  segmentoId,
  clientes,
}: {
  segmentoId: string
  clientes: Pick<Cliente, 'id' | 'nome'>[]
}) {
  const router = useRouter()
  const [clienteId, setClienteId] = useState('')
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Selecao
        value={clienteId}
        onChange={(e) => setClienteId(e.target.value)}
        className="w-auto"
      >
        <option value="">Selecionar cliente…</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </Selecao>
      <Botao
        variante="secundario"
        disabled={!clienteId || pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(null)
            const r = await ligarSegmentoAoCliente(segmentoId, clienteId)
            if (!r.ok) setErro(r.erro)
            else router.refresh()
          })
        }
      >
        {pendente ? 'Vinculando…' : 'Virar projeto de cliente'}
      </Botao>
      {erro && <p className="text-[11.5px] text-magenta-claro">! {erro}</p>}
    </div>
  )
}

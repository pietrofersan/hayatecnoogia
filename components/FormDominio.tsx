'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { adicionarAoRadar, type Resultado } from '@/lib/acoes'
import type { Cliente } from '@/lib/db'
import { Botao, Campo, Entrada, Selecao } from './Campo'

export function FormDominio({ clientes }: { clientes: Pick<Cliente, 'id' | 'nome'>[] }) {
  const router = useRouter()
  const [estado, acao, pendente] = useActionState<Resultado | null, FormData>(
    adicionarAoRadar,
    null,
  )
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    if (estado?.ok) {
      setAberto(false)
      router.refresh()
    }
  }, [estado, router])

  if (!aberto) {
    return (
      <Botao variante="secundario" onClick={() => setAberto(true)}>
        + Vigiar domínio
      </Botao>
    )
  }

  return (
    <form action={acao} className="w-full space-y-3 rounded-lg border border-borda p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo rotulo="Domínio" dica="com extensão: haya.com.br">
          <Entrada name="dominio" placeholder="exemplo.com.br" required autoFocus />
        </Campo>
        <Campo rotulo="Por quê">
          <Entrada name="motivo" placeholder="Marca que queremos" />
        </Campo>
        <Campo rotulo="Cliente (opcional)">
          <Selecao name="cliente_id" defaultValue="">
            <option value="">Nenhum</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
      </div>

      {estado && !estado.ok && <p className="text-xs text-magenta">! {estado.erro}</p>}

      <div className="flex gap-2">
        <Botao type="submit" disabled={pendente}>
          {pendente ? 'Consultando…' : 'Adicionar'}
        </Botao>
        <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>
          Cancelar
        </Botao>
      </div>
    </form>
  )
}

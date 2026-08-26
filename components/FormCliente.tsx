'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { salvarCliente, type Resultado } from '@/lib/acoes'
import { AreaTexto, Botao, Campo, Entrada } from './Campo'

export function FormCliente() {
  const [aberto, setAberto] = useState(false)
  const router = useRouter()
  const [estado, acao, pendente] = useActionState<Resultado | null, FormData>(
    salvarCliente,
    null,
  )

  useEffect(() => {
    if (estado?.ok) {
      setAberto(false)
      router.refresh()
    }
  }, [estado, router])

  if (!aberto) {
    return <Botao onClick={() => setAberto(true)}>Novo cliente</Botao>
  }

  return (
    <form
      action={acao}
      className="w-full rounded-xl border border-linha bg-painel p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome / razão social">
          <Entrada name="nome" required autoFocus />
        </Campo>
        <Campo rotulo="Nome fantasia">
          <Entrada name="nome_fantasia" />
        </Campo>
        <Campo rotulo="CPF / CNPJ" dica="Validado antes de espelhar no Asaas.">
          <Entrada name="documento" inputMode="numeric" />
        </Campo>
        <Campo rotulo="E-mail">
          <Entrada name="email" type="email" />
        </Campo>
        <Campo rotulo="Telefone">
          <Entrada name="telefone" />
        </Campo>
        <Campo rotulo="WhatsApp" dica="Usado no envio do contrato pela ZapSign.">
          <Entrada name="whatsapp" />
        </Campo>
        <div className="sm:col-span-2">
          <Campo rotulo="Observações">
            <AreaTexto name="observacoes" rows={2} />
          </Campo>
        </div>
      </div>

      {estado && !estado.ok && (
        <p className="mt-4 text-xs text-critico">! {estado.erro}</p>
      )}

      <div className="mt-5 flex gap-2">
        <Botao type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : 'Salvar cliente'}
        </Botao>
        <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>
          Cancelar
        </Botao>
      </div>
    </form>
  )
}

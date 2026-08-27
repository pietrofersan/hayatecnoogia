'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { salvarCliente, type Resultado } from '@/lib/acoes'
import type { Cliente } from '@/lib/db'
import { AreaTexto, Botao, Campo, Entrada } from './Campo'
import { Modal } from './Modal'

/** Sem `cliente`, cria; com `cliente`, edita a ficha existente. */
export function FormCliente({
  cliente,
  rotulo,
}: {
  cliente?: Cliente
  rotulo?: string
}) {
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

  return (
    <>
      <Botao
        variante={cliente ? 'secundario' : 'primario'}
        onClick={() => setAberto(true)}
      >
        {rotulo ?? (cliente ? 'Editar cliente' : 'Novo cliente')}
      </Botao>

      {aberto && (
        <Modal
          titulo={cliente ? `Editar ${cliente.nome}` : 'Novo cliente'}
          aoFechar={() => setAberto(false)}
        >
          <FormularioCliente
            acao={acao}
            cliente={cliente}
            estado={estado}
            pendente={pendente}
            aoCancelar={() => setAberto(false)}
          />
        </Modal>
      )}
    </>
  )
}

function FormularioCliente({
  acao,
  cliente,
  estado,
  pendente,
  aoCancelar,
}: {
  acao: (formData: FormData) => void
  cliente?: Cliente
  estado: Resultado | null
  pendente: boolean
  aoCancelar: () => void
}) {
  return (
    <form action={acao}>
      {cliente && <input type="hidden" name="id" value={cliente.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome / razão social">
          <Entrada name="nome" required autoFocus defaultValue={cliente?.nome} />
        </Campo>
        <Campo rotulo="Nome fantasia">
          <Entrada name="nome_fantasia" defaultValue={cliente?.nome_fantasia ?? ''} />
        </Campo>
        <Campo rotulo="CPF / CNPJ" dica="Validado antes de espelhar no Asaas.">
          <Entrada
            name="documento"
            inputMode="numeric"
            defaultValue={cliente?.documento ?? ''}
          />
        </Campo>
        <Campo rotulo="E-mail">
          <Entrada name="email" type="email" defaultValue={cliente?.email ?? ''} />
        </Campo>
        <Campo rotulo="Telefone">
          <Entrada name="telefone" defaultValue={cliente?.telefone ?? ''} />
        </Campo>
        <Campo rotulo="WhatsApp" dica="Usado no envio do contrato pela ZapSign.">
          <Entrada name="whatsapp" defaultValue={cliente?.whatsapp ?? ''} />
        </Campo>
        <div className="sm:col-span-2">
          <Campo rotulo="Observações">
            <AreaTexto name="observacoes" rows={2} defaultValue={cliente?.observacoes ?? ''} />
          </Campo>
        </div>
      </div>

      {estado && !estado.ok && <p className="mt-4 text-xs text-critico">! {estado.erro}</p>}

      <div className="mt-5 flex gap-2">
        <Botao type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : cliente ? 'Salvar alterações' : 'Salvar cliente'}
        </Botao>
        <Botao type="button" variante="secundario" onClick={aoCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  )
}

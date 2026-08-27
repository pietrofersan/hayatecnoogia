'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { atualizarContrato, type Resultado } from '@/lib/acoes'
import type { Contrato, Frente, ModoCobranca } from '@/lib/db'
import { Botao } from './Campo'
import {
  CamposIdentificacao,
  CamposTemplate,
  CamposValores,
  type ClienteResumo,
  type TemplateResumo,
} from './CamposContrato'
import { Modal } from './Modal'

/** Edição de contrato em rascunho — depois de enviado, o PDF já saiu. */
export function FormContratoRascunho({
  contrato,
  clientes,
  templates,
}: {
  contrato: Contrato
  clientes: ClienteResumo[]
  templates: TemplateResumo[]
}) {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <Botao variante="secundario" onClick={() => setAberto(true)}>
        Editar rascunho
      </Botao>
      {aberto && (
        <Modal titulo={`Editar ${contrato.codigo}`} aoFechar={() => setAberto(false)}>
          <Formulario
            contrato={contrato}
            clientes={clientes}
            templates={templates}
            aoFechar={() => setAberto(false)}
          />
        </Modal>
      )}
    </>
  )
}

function Formulario({
  contrato,
  clientes,
  templates,
  aoFechar,
}: {
  contrato: Contrato
  clientes: ClienteResumo[]
  templates: TemplateResumo[]
  aoFechar: () => void
}) {
  const router = useRouter()
  const [clienteId, setClienteId] = useState(contrato.cliente_id)
  const [frente, setFrente] = useState<Frente>(contrato.frente)
  const [templateId, setTemplateId] = useState(contrato.template_id ?? '')
  const [modo, setModo] = useState<ModoCobranca>(contrato.modo)

  const [estado, acao, salvando] = useActionState<Resultado | null, FormData>(
    atualizarContrato,
    null,
  )

  useEffect(() => {
    if (estado?.ok) {
      aoFechar()
      router.refresh()
    }
  }, [estado, aoFechar, router])

  return (
    <form action={acao} className="space-y-5">
      <input type="hidden" name="id" value={contrato.id} />

      <CamposIdentificacao
        clientes={clientes}
        clienteId={clienteId}
        aoTrocarCliente={setClienteId}
        frente={frente}
        aoTrocarFrente={setFrente}
      />
      <CamposTemplate
        templates={templates}
        frente={frente}
        templateId={templateId}
        aoTrocarTemplate={setTemplateId}
        contrato={contrato}
      />
      <CamposValores modo={modo} aoTrocarModo={setModo} contrato={contrato} />

      {estado && !estado.ok && <p className="text-xs text-critico">! {estado.erro}</p>}

      <div className="flex gap-2">
        <Botao type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </Botao>
        <Botao type="button" variante="secundario" onClick={aoFechar}>
          Cancelar
        </Botao>
      </div>
    </form>
  )
}

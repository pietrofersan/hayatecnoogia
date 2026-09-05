'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { salvarTemplate, type Resultado } from '@/lib/acoes'
import { FRENTES, ROTULO_FRENTE, ROTULO_TIPO, TIPOS_CONTRATO } from '@/lib/db'
import { AreaTexto, Botao, Campo, Entrada, Selecao } from './Campo'
import { Modal } from './Modal'

export function FormTemplate() {
  const [aberto, setAberto] = useState(false)
  const router = useRouter()
  const [estado, acao, pendente] = useActionState<Resultado | null, FormData>(
    salvarTemplate,
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
      <Botao variante="secundario" onClick={() => setAberto(true)}>
        Novo template
      </Botao>
      {aberto && (
        <Modal titulo="Novo template de contrato" aoFechar={() => setAberto(false)}>
          <Formulario acao={acao} estado={estado} pendente={pendente} aoCancelar={() => setAberto(false)} />
        </Modal>
      )}
    </>
  )
}

function Formulario({
  acao,
  estado,
  pendente,
  aoCancelar,
}: {
  acao: (formData: FormData) => void
  estado: Resultado | null
  pendente: boolean
  aoCancelar: () => void
}) {
  return (
    <form action={acao} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Nome">
          <Entrada name="nome" required autoFocus />
        </Campo>
        <Campo rotulo="Frente">
          <Selecao name="frente" defaultValue="">
            <option value="">Qualquer</option>
            {FRENTES.map((f) => (
              <option key={f} value={f}>
                {ROTULO_FRENTE[f]}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Tipo">
          <Selecao name="tipo" defaultValue="">
            <option value="">Qualquer</option>
            {TIPOS_CONTRATO.map((t) => (
              <option key={t} value={t}>
                {ROTULO_TIPO[t]}
              </option>
            ))}
          </Selecao>
        </Campo>
      </div>

      <Campo
        rotulo="Corpo (HTML)"
        dica="Merge tags: {{cliente.nome}} · {{cliente.documento}} · {{contrato.codigo}} · {{valor}} · {{parcelas}} · {{vigencia}} · {{dia_vencimento}}"
      >
        <AreaTexto name="corpo_html" rows={12} required className="font-mono text-xs" />
      </Campo>

      {estado && !estado.ok && <p className="text-xs text-magenta">! {estado.erro}</p>}

      <div className="flex gap-2">
        <Botao type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : 'Salvar template'}
        </Botao>
        <Botao type="button" variante="secundario" onClick={aoCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  )
}

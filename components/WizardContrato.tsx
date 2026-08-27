'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState, useTransition } from 'react'
import { enviarParaAssinatura, salvarContrato, type Resultado } from '@/lib/acoes'
import type { Frente, ModoCobranca } from '@/lib/db'
import { Botao } from './Campo'
import {
  CamposIdentificacao,
  CamposTemplate,
  CamposValores,
  type ClienteResumo,
  type TemplateResumo,
} from './CamposContrato'
import { Modal } from './Modal'

const PASSOS = ['Cliente', 'Template', 'Valores', 'Gerar'] as const

/**
 * Wizard "Novo contrato" (seção 6.3): cliente → template → valores →
 * gerar → enviar ZapSign.
 */
export function WizardContrato({
  clientes,
  templates,
}: {
  clientes: ClienteResumo[]
  templates: TemplateResumo[]
}) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <Botao onClick={() => setAberto(true)}>Novo contrato</Botao>
      {aberto && (
        <Modal titulo="Novo contrato" aoFechar={() => setAberto(false)}>
          <Passos
            clientes={clientes}
            templates={templates}
            aoFechar={() => {
              setAberto(false)
              router.refresh()
            }}
          />
        </Modal>
      )}
    </>
  )
}

function Passos({
  clientes,
  templates,
  aoFechar,
}: {
  clientes: ClienteResumo[]
  templates: TemplateResumo[]
  aoFechar: () => void
}) {
  const router = useRouter()
  const [passo, setPasso] = useState(0)
  const [clienteId, setClienteId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [frente, setFrente] = useState<Frente>('digital')
  const [modo, setModo] = useState<ModoCobranca>('recorrente')
  const [criadoId, setCriadoId] = useState<string | null>(null)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [enviando, iniciarEnvio] = useTransition()

  const [estado, acao, salvando] = useActionState<Resultado | null, FormData>(
    salvarContrato,
    null,
  )

  useEffect(() => {
    if (estado?.ok && estado.id) {
      setCriadoId(estado.id)
      setPasso(3)
      router.refresh()
    }
  }, [estado, router])

  return (
    <div>
      <ol className="mb-5 flex gap-2 text-[11px]">
        {PASSOS.map((p, i) => (
          <li
            key={p}
            className={`rounded-md px-2 py-1 ${
              i === passo ? 'bg-tec text-noite' : i < passo ? 'text-vis' : 'text-apagado'
            }`}
          >
            {i + 1}. {p}
          </li>
        ))}
      </ol>

      <form action={acao}>
        <div className={passo === 0 ? '' : 'hidden'}>
          <CamposIdentificacao
            clientes={clientes}
            clienteId={clienteId}
            aoTrocarCliente={setClienteId}
            frente={frente}
            aoTrocarFrente={setFrente}
          />
        </div>

        <div className={passo === 1 ? '' : 'hidden'}>
          <CamposTemplate
            templates={templates}
            frente={frente}
            templateId={templateId}
            aoTrocarTemplate={setTemplateId}
          />
        </div>

        <div className={passo === 2 ? '' : 'hidden'}>
          <CamposValores modo={modo} aoTrocarModo={setModo} />
        </div>

        {passo === 3 && (
          <div className="space-y-3">
            {criadoId ? (
              <>
                <p className="text-sm text-ink-2">
                  ✓ Contrato criado em rascunho. Envie para assinatura na ZapSign — a
                  cobrança no Asaas nasce quando o cliente assinar.
                </p>
                {erroEnvio && <p className="text-xs text-critico">! {erroEnvio}</p>}
                <div className="flex flex-wrap gap-2">
                  <Botao
                    type="button"
                    disabled={enviando}
                    onClick={() =>
                      iniciarEnvio(async () => {
                        const r = await enviarParaAssinatura(criadoId)
                        if (!r.ok) setErroEnvio(r.erro)
                        else aoFechar()
                      })
                    }
                  >
                    {enviando ? 'Enviando…' : 'Enviar para assinatura'}
                  </Botao>
                  <Botao type="button" variante="secundario" onClick={aoFechar}>
                    Deixar em rascunho
                  </Botao>
                </div>
              </>
            ) : (
              <p className="text-sm text-apagado">Salvando…</p>
            )}
          </div>
        )}

        {estado && !estado.ok && <p className="mt-4 text-xs text-critico">! {estado.erro}</p>}

        {passo < 3 && (
          <div className="mt-5 flex gap-2">
            {passo > 0 && (
              <Botao type="button" variante="secundario" onClick={() => setPasso(passo - 1)}>
                Voltar
              </Botao>
            )}
            {passo < 2 ? (
              <Botao
                type="button"
                disabled={passo === 0 && !clienteId}
                onClick={() => setPasso(passo + 1)}
              >
                Continuar
              </Botao>
            ) : (
              <Botao type="submit" disabled={salvando}>
                {salvando ? 'Gerando…' : 'Gerar contrato'}
              </Botao>
            )}
            <Botao type="button" variante="secundario" onClick={aoFechar}>
              Cancelar
            </Botao>
          </div>
        )}
      </form>
    </div>
  )
}

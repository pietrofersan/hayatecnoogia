'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState, useTransition } from 'react'
import { enviarParaAssinatura, salvarContrato, type Resultado } from '@/lib/acoes'
import type { Cliente, Frente, TemplateContrato } from '@/lib/db'
import { FRENTES, ROTULO_FRENTE, ROTULO_TIPO, TIPOS_CONTRATO } from '@/lib/db'
import { AreaTexto, Botao, Campo, Entrada, Selecao } from './Campo'

const PASSOS = ['Cliente', 'Template', 'Valores', 'Gerar'] as const

/**
 * Wizard "Novo contrato" (seção 6.3): cliente → template → valores →
 * gerar → enviar ZapSign.
 */
export function WizardContrato({
  clientes,
  templates,
}: {
  clientes: Pick<Cliente, 'id' | 'nome' | 'email' | 'whatsapp'>[]
  templates: Pick<TemplateContrato, 'id' | 'nome' | 'frente' | 'tipo'>[]
}) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [passo, setPasso] = useState(0)
  const [clienteId, setClienteId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [frente, setFrente] = useState<Frente>('digital')
  const [modo, setModo] = useState<'recorrente' | 'parcelado' | 'avulso'>('recorrente')
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

  function fechar() {
    setAberto(false)
    setPasso(0)
    setCriadoId(null)
    setErroEnvio(null)
  }

  if (!aberto) return <Botao onClick={() => setAberto(true)}>Novo contrato</Botao>

  const cliente = clientes.find((c) => c.id === clienteId)
  const templatesDaFrente = templates.filter((t) => !t.frente || t.frente === frente)

  return (
    <div className="w-full rounded-xl border border-linha bg-painel p-5">
      <ol className="mb-5 flex gap-2 text-[11px]">
        {PASSOS.map((p, i) => (
          <li
            key={p}
            className={`rounded-md px-2 py-1 ${
              i === passo
                ? 'bg-tec text-noite'
                : i < passo
                  ? 'text-vis'
                  : 'text-apagado'
            }`}
          >
            {i + 1}. {p}
          </li>
        ))}
      </ol>

      <form action={acao}>
        {/* Passo 1 — cliente */}
        <div className={passo === 0 ? 'grid gap-4 sm:grid-cols-2' : 'hidden'}>
          <Campo rotulo="Cliente">
            <Selecao
              name="cliente_id"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              required
            >
              <option value="">Selecione…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Frente">
            <Selecao
              name="frente"
              value={frente}
              onChange={(e) => setFrente(e.target.value as Frente)}
            >
              {FRENTES.map((f) => (
                <option key={f} value={f}>
                  {ROTULO_FRENTE[f]}
                </option>
              ))}
            </Selecao>
          </Campo>
          {cliente && !cliente.email && !cliente.whatsapp && (
            <p className="text-xs text-alerta sm:col-span-2">
              ! Este cliente não tem e-mail nem WhatsApp — o envio para assinatura vai falhar.
            </p>
          )}
        </div>

        {/* Passo 2 — template e tipo */}
        <div className={passo === 1 ? 'grid gap-4 sm:grid-cols-2' : 'hidden'}>
          <Campo rotulo="Tipo de contrato">
            <Selecao name="tipo" required defaultValue="">
              <option value="">Selecione…</option>
              {TIPOS_CONTRATO.map((t) => (
                <option key={t} value={t}>
                  {ROTULO_TIPO[t]}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo
            rotulo="Template"
            dica={
              templatesDaFrente.length === 0
                ? 'Nenhum template cadastrado para esta frente (Config).'
                : undefined
            }
          >
            <Selecao
              name="template_id"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">Sem template (rascunho manual)</option>
              {templatesDaFrente.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <div className="sm:col-span-2">
            <Campo rotulo="Descrição">
              <AreaTexto name="descricao" rows={2} />
            </Campo>
          </div>
        </div>

        {/* Passo 3 — valores */}
        <div className={passo === 2 ? 'grid gap-4 sm:grid-cols-2' : 'hidden'}>
          <Campo rotulo="Modo de cobrança">
            <Selecao
              name="modo"
              value={modo}
              onChange={(e) => setModo(e.target.value as typeof modo)}
            >
              <option value="recorrente">Recorrente (mensal)</option>
              <option value="parcelado">Parcelado</option>
              <option value="avulso">Avulso</option>
            </Selecao>
          </Campo>
          <Campo
            rotulo={modo === 'recorrente' ? 'Mensalidade' : 'Valor total'}
            dica="Ex.: 1.499,90"
          >
            <Entrada name="valor" inputMode="decimal" required />
          </Campo>
          {modo === 'parcelado' && (
            <Campo rotulo="Parcelas">
              <Entrada name="parcelas" type="number" min={2} max={24} defaultValue={2} />
            </Campo>
          )}
          <Campo rotulo="Dia de vencimento" dica="1 a 28.">
            <Entrada
              name="dia_vencimento"
              type="number"
              min={1}
              max={28}
              defaultValue={10}
              required={modo === 'recorrente'}
            />
          </Campo>
          <Campo rotulo="Início">
            <Entrada name="inicio" type="date" />
          </Campo>
          <Campo rotulo="Fim" dica="Em branco = vigência indeterminada.">
            <Entrada name="fim" type="date" />
          </Campo>
        </div>

        {/* Passo 4 — gerado */}
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
                        else {
                          router.refresh()
                          fechar()
                        }
                      })
                    }
                  >
                    {enviando ? 'Enviando…' : 'Enviar para assinatura'}
                  </Botao>
                  <Botao type="button" variante="secundario" onClick={fechar}>
                    Deixar em rascunho
                  </Botao>
                </div>
              </>
            ) : (
              <p className="text-sm text-apagado">Salvando…</p>
            )}
          </div>
        )}

        {estado && !estado.ok && (
          <p className="mt-4 text-xs text-critico">! {estado.erro}</p>
        )}

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
            <Botao type="button" variante="secundario" onClick={fechar}>
              Cancelar
            </Botao>
          </div>
        )}
      </form>
    </div>
  )
}

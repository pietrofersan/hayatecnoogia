'use client'

import type { Cliente, Contrato, Frente, ModoCobranca, TemplateContrato } from '@/lib/db'
import { FRENTES, ROTULO_FRENTE, ROTULO_MODO, ROTULO_TIPO, TIPOS_CONTRATO } from '@/lib/db'
import { AreaTexto, Campo, Entrada, Selecao } from './Campo'

/**
 * Campos do contrato, compartilhados entre o wizard de criação (um grupo
 * por passo) e a edição de rascunho (os três grupos de uma vez).
 */

export type ClienteResumo = Pick<Cliente, 'id' | 'nome' | 'email' | 'whatsapp'>
export type TemplateResumo = Pick<TemplateContrato, 'id' | 'nome' | 'frente' | 'tipo'>

export function CamposIdentificacao({
  clientes,
  clienteId,
  aoTrocarCliente,
  frente,
  aoTrocarFrente,
}: {
  clientes: ClienteResumo[]
  clienteId: string
  aoTrocarCliente: (id: string) => void
  frente: Frente
  aoTrocarFrente: (f: Frente) => void
}) {
  const cliente = clientes.find((c) => c.id === clienteId)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Cliente">
        <Selecao
          name="cliente_id"
          value={clienteId}
          onChange={(e) => aoTrocarCliente(e.target.value)}
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
          onChange={(e) => aoTrocarFrente(e.target.value as Frente)}
        >
          {FRENTES.map((f) => (
            <option key={f} value={f}>
              {ROTULO_FRENTE[f]}
            </option>
          ))}
        </Selecao>
      </Campo>
      {cliente && !cliente.email && !cliente.whatsapp && (
        <p className="text-xs text-ambar sm:col-span-2">
          ! Este cliente não tem e-mail nem WhatsApp — o envio para assinatura vai falhar.
        </p>
      )}
    </div>
  )
}

export function CamposTemplate({
  templates,
  frente,
  templateId,
  aoTrocarTemplate,
  contrato,
}: {
  templates: TemplateResumo[]
  frente: Frente
  templateId: string
  aoTrocarTemplate: (id: string) => void
  contrato?: Contrato
}) {
  const disponiveis = templates.filter((t) => !t.frente || t.frente === frente)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Tipo de contrato">
        <Selecao name="tipo" required defaultValue={contrato?.tipo ?? ''}>
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
          disponiveis.length === 0
            ? 'Nenhum template cadastrado para esta frente (Config).'
            : undefined
        }
      >
        <Selecao
          name="template_id"
          value={templateId}
          onChange={(e) => aoTrocarTemplate(e.target.value)}
        >
          <option value="">Sem template (rascunho manual)</option>
          {disponiveis.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </Selecao>
      </Campo>
      <div className="sm:col-span-2">
        <Campo rotulo="Descrição">
          <AreaTexto name="descricao" rows={2} defaultValue={contrato?.descricao ?? ''} />
        </Campo>
      </div>
    </div>
  )
}

export function CamposValores({
  modo,
  aoTrocarModo,
  contrato,
}: {
  modo: ModoCobranca
  aoTrocarModo: (m: ModoCobranca) => void
  contrato?: Contrato
}) {
  const valorInicial = contrato
    ? (Number(contrato.valor_centavos) / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
      })
    : ''

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Modo de cobrança">
        <Selecao
          name="modo"
          value={modo}
          onChange={(e) => aoTrocarModo(e.target.value as ModoCobranca)}
        >
          <option value="recorrente">{ROTULO_MODO.recorrente} (mensal)</option>
          <option value="parcelado">{ROTULO_MODO.parcelado}</option>
          <option value="avulso">{ROTULO_MODO.avulso}</option>
        </Selecao>
      </Campo>
      <Campo
        rotulo={modo === 'recorrente' ? 'Mensalidade' : 'Valor total'}
        dica="Ex.: 1.499,90"
      >
        <Entrada name="valor" inputMode="decimal" required defaultValue={valorInicial} />
      </Campo>
      {modo === 'parcelado' && (
        <Campo rotulo="Parcelas">
          <Entrada
            name="parcelas"
            type="number"
            min={2}
            max={24}
            defaultValue={contrato?.parcelas ?? 2}
          />
        </Campo>
      )}
      <Campo rotulo="Dia de vencimento" dica="1 a 28.">
        <Entrada
          name="dia_vencimento"
          type="number"
          min={1}
          max={28}
          defaultValue={contrato?.dia_vencimento ?? 10}
          required={modo === 'recorrente'}
        />
      </Campo>
      <Campo rotulo="Início">
        <Entrada name="inicio" type="date" defaultValue={contrato?.inicio ?? ''} />
      </Campo>
      <Campo rotulo="Fim" dica="Em branco = vigência indeterminada.">
        <Entrada name="fim" type="date" defaultValue={contrato?.fim ?? ''} />
      </Campo>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { ativarCliente, type Resultado } from '@/lib/acoes'
import { FRENTES, ROTULO_FRENTE, ROTULO_MODO, ROTULO_TIPO, TIPOS_CONTRATO } from '@/lib/db'
import { AreaTexto, Botao, Campo, Entrada, Selecao } from './Campo'
import { Painel } from './Painel'
import { cn } from './cn'

const PASSOS = [
  'Dados da empresa',
  'Segmento e palavras',
  'Plano e contrato',
  'Integrações',
  'Revisão e ativação',
] as const

type Dados = Record<string, string>

const INICIAL: Dados = {
  nome: '',
  nome_fantasia: '',
  documento: '',
  email: '',
  telefone: '',
  whatsapp: '',
  segmento: '',
  palavras: '',
  frente: 'digital',
  tipo: 'marketing_mensal',
  modo: 'recorrente',
  valor: '',
  dia_vencimento: '10',
  dominio: '',
}

/**
 * Onboarding em 5 passos (README §13). O formulário é um só — os passos
 * são recortes dele — para que o envio final leve tudo de uma vez e a
 * criação do cliente seja uma transação só do ponto de vista do usuário.
 */
export function WizardOnboarding() {
  const router = useRouter()
  const [passo, setPasso] = useState(0)
  const [dados, setDados] = useState<Dados>(INICIAL)
  const [estado, acao, enviando] = useActionState<Resultado | null, FormData>(
    ativarCliente,
    null,
  )

  useEffect(() => {
    if (estado?.ok && estado.id) router.push(`/clientes/${estado.id}`)
  }, [estado, router])

  const set = (campo: string) => (valor: string) =>
    setDados((d) => ({ ...d, [campo]: valor }))

  const ultimo = passo === PASSOS.length - 1
  const podeAvancar = passo !== 0 || dados.nome.trim().length >= 2

  return (
    <form action={acao} className="space-y-3.5">
      {/* Tudo vai no envio, mesmo o que não está na tela do passo atual. */}
      {Object.entries(dados).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      <Painel>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
          {PASSOS.map((p, i) => (
            <li key={p} className="flex items-center gap-2">
              <span
                className={cn(
                  'grid size-6 place-items-center rounded-full border font-mono text-[10px]',
                  i < passo
                    ? 'border-verde/40 bg-verde/15 text-verde'
                    : i === passo
                      ? 'border-ciano/50 bg-ciano/15 text-ciano-claro shadow-glow-ciano'
                      : 'border-borda text-fantasma',
                )}
              >
                {i < passo ? '✓' : i + 1}
              </span>
              <span
                className={cn(
                  'text-[11.5px]',
                  i === passo ? 'text-pleno' : 'text-fantasma',
                )}
              >
                {p}
              </span>
              {i < PASSOS.length - 1 && (
                <span aria-hidden className="mx-1 text-fantasma">
                  ·
                </span>
              )}
            </li>
          ))}
        </ol>
      </Painel>

      <Painel titulo={PASSOS[passo]}>
        {passo === 0 && (
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Campo rotulo="Nome ou razão social">
              <Entrada
                value={dados.nome}
                onChange={(e) => set('nome')(e.target.value)}
                required
                autoFocus
              />
            </Campo>
            <Campo rotulo="Nome fantasia">
              <Entrada
                value={dados.nome_fantasia}
                onChange={(e) => set('nome_fantasia')(e.target.value)}
              />
            </Campo>
            <Campo rotulo="CPF / CNPJ">
              <Entrada
                value={dados.documento}
                onChange={(e) => set('documento')(e.target.value)}
              />
            </Campo>
            <Campo rotulo="E-mail">
              <Entrada
                type="email"
                value={dados.email}
                onChange={(e) => set('email')(e.target.value)}
              />
            </Campo>
            <Campo rotulo="Telefone">
              <Entrada
                value={dados.telefone}
                onChange={(e) => set('telefone')(e.target.value)}
              />
            </Campo>
            <Campo rotulo="WhatsApp" dica="Usado pelo CRM e pela régua de cobrança.">
              <Entrada
                value={dados.whatsapp}
                onChange={(e) => set('whatsapp')(e.target.value)}
              />
            </Campo>
          </div>
        )}

        {passo === 1 && (
          <div className="space-y-3.5">
            <Campo
              rotulo="Segmento"
              dica="Vira um segmento ligado a este cliente, com medição noturna."
            >
              <Entrada
                value={dados.segmento}
                onChange={(e) => set('segmento')(e.target.value)}
                placeholder="Comunicação visual"
              />
            </Campo>
            <Campo
              rotulo="Palavras-chave"
              dica="Uma por linha ou separadas por vírgula. Dá para expandir com IA depois."
            >
              <AreaTexto
                rows={5}
                value={dados.palavras}
                onChange={(e) => set('palavras')(e.target.value)}
                placeholder={'fachada em acm\nletra caixa\ncomunicação visual'}
              />
            </Campo>
          </div>
        )}

        {passo === 2 && (
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Campo rotulo="Frente">
              <Selecao
                value={dados.frente}
                onChange={(e) => set('frente')(e.target.value)}
              >
                {FRENTES.map((f) => (
                  <option key={f} value={f}>
                    {ROTULO_FRENTE[f]}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Tipo de contrato">
              <Selecao value={dados.tipo} onChange={(e) => set('tipo')(e.target.value)}>
                {TIPOS_CONTRATO.map((t) => (
                  <option key={t} value={t}>
                    {ROTULO_TIPO[t]}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Modo de cobrança">
              <Selecao value={dados.modo} onChange={(e) => set('modo')(e.target.value)}>
                {(['recorrente', 'parcelado', 'avulso'] as const).map((m) => (
                  <option key={m} value={m}>
                    {ROTULO_MODO[m]}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Mensalidade" dica="Deixe vazio para não abrir contrato agora.">
              <Entrada
                value={dados.valor}
                onChange={(e) => set('valor')(e.target.value)}
                placeholder="2.400,00"
                inputMode="decimal"
              />
            </Campo>
            <Campo rotulo="Dia de vencimento">
              <Entrada
                type="number"
                min={1}
                max={28}
                value={dados.dia_vencimento}
                onChange={(e) => set('dia_vencimento')(e.target.value)}
              />
            </Campo>
          </div>
        )}

        {passo === 3 && (
          <div className="space-y-3.5">
            <Campo
              rotulo="Domínio principal"
              dica="Entra no radar de domínios para vigiar vencimento e disponibilidade."
            >
              <Entrada
                value={dados.dominio}
                onChange={(e) => set('dominio')(e.target.value)}
                placeholder="cliente.com.br"
              />
            </Campo>
            <div className="rounded-ctrl border border-borda bg-white/[0.02] px-3.5 py-3 text-[11.5px] text-tenue">
              <p className="text-suave">O que ainda depende de você, depois de ativar:</p>
              <ul className="mt-2 space-y-1">
                <li>
                  · <span className="text-corpo">WhatsApp</span> — conectar o canal em
                  Integrações (QR do adaptador).
                </li>
                <li>
                  · <span className="text-corpo">Meta</span> — ligar Instagram e Facebook
                  pelo mesmo painel de Integrações.
                </li>
                <li>
                  · <span className="text-corpo">Asaas</span> — o espelho do cliente é
                  criado ao ativar a cobrança do contrato.
                </li>
              </ul>
            </div>
          </div>
        )}

        {passo === 4 && (
          <dl className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            <Revisao rotulo="Nome" valor={dados.nome} />
            <Revisao rotulo="Documento" valor={dados.documento} />
            <Revisao rotulo="E-mail" valor={dados.email} />
            <Revisao rotulo="WhatsApp" valor={dados.whatsapp} />
            <Revisao rotulo="Segmento" valor={dados.segmento} />
            <Revisao
              rotulo="Palavras"
              valor={
                dados.palavras
                  ? `${dados.palavras.split(/[,\n]/).filter((t) => t.trim()).length} termo(s)`
                  : ''
              }
            />
            <Revisao
              rotulo="Contrato"
              valor={
                dados.valor
                  ? `${ROTULO_TIPO[dados.tipo]} · ${ROTULO_MODO[dados.modo as 'recorrente']} · R$ ${dados.valor}`
                  : 'sem contrato agora'
              }
            />
            <Revisao rotulo="Domínio" valor={dados.dominio} />
          </dl>
        )}

        {estado && !estado.ok && (
          <p
            role="alert"
            className="mt-4 rounded-ctrl border border-magenta/40 bg-magenta/10 px-3 py-2 text-[11.5px] text-magenta-claro"
          >
            ! {estado.erro}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-borda pt-4">
          <Botao
            type="button"
            variante="secundario"
            disabled={passo === 0 || enviando}
            onClick={() => setPasso((p) => Math.max(0, p - 1))}
          >
            Voltar
          </Botao>

          {ultimo ? (
            <Botao type="submit" variante="primario" disabled={enviando}>
              {enviando ? 'Ativando…' : 'Ativar cliente'}
            </Botao>
          ) : (
            <Botao
              type="button"
              variante="primario"
              disabled={!podeAvancar}
              onClick={() => setPasso((p) => Math.min(PASSOS.length - 1, p + 1))}
            >
              Continuar
            </Botao>
          )}
        </div>
      </Painel>
    </form>
  )
}

function Revisao({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-borda/60 py-1.5">
      <dt className="font-mono text-[10px] tracking-[0.16em] text-fantasma uppercase">
        {rotulo}
      </dt>
      <dd className="truncate font-mono text-[11.5px] text-mono">
        {valor || <span className="text-abissal">—</span>}
      </dd>
    </div>
  )
}

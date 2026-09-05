'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { gerarConteudo, type Resultado } from '@/lib/acoes'
import type { Cliente } from '@/lib/db'
import { CANAIS_CONTEUDO, ROTULO_CANAL_CONTEUDO } from '@/lib/db'
import { Botao, Campo, Entrada, Selecao } from './Campo'
import { Modal } from './Modal'

/**
 * Dispara a geração por IA. Tudo que sai daqui nasce em `aguardando` —
 * o botão nem oferece a opção de publicar direto, de propósito.
 */
export function FormGerarConteudo({
  clientes,
}: {
  clientes: Pick<Cliente, 'id' | 'nome'>[]
}) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [estado, acao, pendente] = useActionState<Resultado | null, FormData>(
    gerarConteudo,
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
        variante="primario"
        onClick={() => setAberto(true)}
        disabled={clientes.length === 0}
      >
        ✦ Gerar com IA
      </Botao>

      {aberto && (
        <Modal titulo="Gerar peças com IA" aoFechar={() => setAberto(false)}>
          <form action={acao} className="space-y-3.5">
            <Campo rotulo="Cliente">
              <Selecao name="cliente_id" required defaultValue={clientes[0]?.id}>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Campo rotulo="Canal">
                <Selecao name="canal" defaultValue="instagram">
                  {CANAIS_CONTEUDO.map((c) => (
                    <option key={c} value={c}>
                      {ROTULO_CANAL_CONTEUDO[c]}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Quantas peças">
                <Selecao name="quantidade" defaultValue="3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Selecao>
              </Campo>
            </div>

            <Campo
              rotulo="Tema"
              dica="Sobre o que escrever — quanto mais concreto, melhor a peça."
            >
              <Entrada
                name="tema"
                required
                placeholder="Ex.: erros comuns na escolha de fachada em ACM"
              />
            </Campo>

            <p className="rounded-ctrl border border-ambar/30 bg-ambar/[0.07] px-3 py-2 text-[11px] text-ambar">
              As peças entram como <strong>aguardando</strong> — nada é publicado
              sem alguém aprovar.
            </p>

            {estado && !estado.ok && (
              <p className="text-[11.5px] text-magenta-claro">! {estado.erro}</p>
            )}

            <div className="flex gap-2.5">
              <Botao type="submit" disabled={pendente}>
                {pendente ? 'Gerando…' : 'Gerar'}
              </Botao>
              <Botao
                type="button"
                variante="secundario"
                onClick={() => setAberto(false)}
              >
                Cancelar
              </Botao>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

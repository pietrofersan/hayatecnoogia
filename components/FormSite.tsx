'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { salvarSite, type Resultado } from '@/lib/acoes'
import type { Cliente, Site } from '@/lib/db'
import { Botao, Campo, Entrada, Selecao } from './Campo'
import { Modal } from './Modal'

const HOSTS = ['locaweb', 'hostinger', 'vercel', 'outro'] as const

/** Cadastro/edição de site. A chave de leads é gerada pelo banco e não muda. */
export function FormSite({
  clientes,
  site,
}: {
  clientes: Pick<Cliente, 'id' | 'nome'>[]
  site?: Site
}) {
  const [aberto, setAberto] = useState(false)
  const router = useRouter()
  const [estado, acao, pendente] = useActionState<Resultado | null, FormData>(
    salvarSite,
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
        {site ? 'Editar' : 'Novo site'}
      </Botao>

      {aberto && (
        <Modal
          titulo={site ? `Editar ${site.dominio}` : 'Novo site'}
          aoFechar={() => setAberto(false)}
        >
          <form action={acao}>
            {site && <input type="hidden" name="id" value={site.id} />}

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Domínio" dica="Sem http:// e sem www.">
                <Entrada
                  name="dominio"
                  required
                  autoFocus
                  placeholder="cliente.com.br"
                  defaultValue={site?.dominio}
                />
              </Campo>
              <Campo rotulo="Cliente">
                <Selecao name="cliente_id" defaultValue={site?.cliente_id ?? ''}>
                  <option value="">Sem cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Hospedagem">
                <Selecao name="host" defaultValue={site?.host ?? ''}>
                  <option value="">Não informado</option>
                  {HOSTS.map((h) => (
                    <option key={h} value={h}>
                      {h[0].toUpperCase() + h.slice(1)}
                    </option>
                  ))}
                </Selecao>
              </Campo>
            </div>

            {estado && !estado.ok && (
              <p className="mt-4 text-xs text-critico">! {estado.erro}</p>
            )}

            <div className="mt-5 flex gap-2">
              <Botao type="submit" disabled={pendente}>
                {pendente ? 'Salvando…' : site ? 'Salvar alterações' : 'Cadastrar site'}
              </Botao>
              <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>
                Cancelar
              </Botao>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

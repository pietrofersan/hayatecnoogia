'use client'

import { useState } from 'react'
import type { ArestaMapa, NoMapa, TipoNoMapa } from '@/lib/db'
import { ROTULO_TIPO_NO } from '@/lib/db'
import { Painel } from './Painel'
import { StatusBadge, type TomBadge } from './StatusBadge'

/** Cor por tipo de nó, conforme a legenda do handoff (§4). */
const COR: Record<TipoNoMapa, { traco: string; preenche: string; tom: TomBadge }> = {
  hub: { traco: '#E8ECF8', preenche: 'rgba(232,236,248,.12)', tom: 'neutro' },
  subdominio: { traco: '#22D3EE', preenche: 'rgba(34,211,238,.14)', tom: 'ciano' },
  landing: { traco: '#A855F7', preenche: 'rgba(168,85,247,.14)', tom: 'roxo' },
  satelite: { traco: '#34E5B0', preenche: 'rgba(52,229,176,.14)', tom: 'verde' },
  canibalizacao: { traco: '#F0338F', preenche: 'rgba(240,51,143,.14)', tom: 'magenta' },
  buraco: { traco: '#F5A524', preenche: 'rgba(245,165,36,.10)', tom: 'ambar' },
}

const LEGENDA: TipoNoMapa[] = [
  'hub',
  'subdominio',
  'landing',
  'satelite',
  'canibalizacao',
  'buraco',
]

function raio(tipo: TipoNoMapa) {
  return tipo === 'hub' ? 30 : 18
}

export function MapaPosicionamento({
  nos,
  arestas,
}: {
  nos: NoMapa[]
  arestas: ArestaMapa[]
}) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(
    nos.find((n) => n.tipo === 'hub')?.id ?? nos[0]?.id ?? null,
  )
  const [zoom, setZoom] = useState(1)

  const selecionado = nos.find((n) => n.id === selecionadoId) ?? null
  const porId = new Map(nos.map((n) => [n.id, n]))
  const hub = nos.find((n) => n.tipo === 'hub')

  const canibalizacoes = nos.filter((n) => n.tipo === 'canibalizacao')
  const buracos = nos.filter((n) => n.tipo === 'buraco')

  return (
    <div className="grid gap-3.5 xl:grid-cols-[1fr_300px]">
      <Painel densidade="card" className="relative overflow-hidden">
        <div className="absolute top-4 right-4 z-10 flex gap-1.5">
          <BotaoZoom onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}>+</BotaoZoom>
          <BotaoZoom onClick={() => setZoom((z) => Math.max(z - 0.2, 0.6))}>−</BotaoZoom>
          <BotaoZoom onClick={() => setZoom(1)}>⤢</BotaoZoom>
        </div>

        <div className="-mx-1 overflow-auto">
          <svg
            viewBox="0 0 900 560"
            className="h-auto w-full min-w-[40rem]"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
            role="img"
            aria-label="Mapa de posicionamento da marca"
          >
            <defs>
              <radialGradient id="halo-mapa" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(76,111,255,.18)" />
                <stop offset="100%" stopColor="rgba(4,6,13,0)" />
              </radialGradient>
            </defs>
            <rect width="900" height="560" fill="url(#halo-mapa)" />

            {hub && (
              <circle
                cx={hub.x}
                cy={hub.y}
                r={48}
                fill="none"
                stroke="rgba(232,236,248,.22)"
                strokeDasharray="4 6"
              />
            )}

            {arestas.map((a) => {
              const de = porId.get(a.de)
              const para = porId.get(a.para)
              if (!de || !para) return null
              return (
                <line
                  key={a.id}
                  x1={de.x}
                  y1={de.y}
                  x2={para.x}
                  y2={para.y}
                  stroke={a.canibalizacao ? '#F0338F' : '#4C6FFF'}
                  strokeWidth={1}
                  strokeOpacity={a.canibalizacao ? 0.8 : 0.5}
                  strokeDasharray={a.canibalizacao ? '5 5' : undefined}
                />
              )
            })}

            {nos.map((n) => {
              const cor = COR[n.tipo]
              const ativo = n.id === selecionadoId
              return (
                <g
                  key={n.id}
                  onClick={() => setSelecionadoId(n.id)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={raio(n.tipo)}
                    fill={cor.preenche}
                    stroke={cor.traco}
                    strokeWidth={ativo ? 2.5 : 1.5}
                    strokeDasharray={n.tipo === 'buraco' ? '4 4' : undefined}
                    style={ativo ? { filter: `drop-shadow(0 0 12px ${cor.traco})` } : undefined}
                  />
                  <text
                    x={n.x}
                    y={n.y + raio(n.tipo) + 14}
                    textAnchor="middle"
                    className="font-mono"
                    fontSize={10}
                    fill={ativo ? '#E8ECF8' : '#7E8DB5'}
                  >
                    {n.rotulo}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {LEGENDA.map((t) => (
            <li
              key={t}
              className="flex items-center gap-1.5 font-mono text-[9.5px] text-fantasma"
            >
              <span
                className="size-2 rounded-full border"
                style={{ borderColor: COR[t].traco, background: COR[t].preenche }}
              />
              {ROTULO_TIPO_NO[t]}
            </li>
          ))}
        </ul>
      </Painel>

      <div className="space-y-3.5">
        <Painel titulo="Nó selecionado" densidade="card">
          {!selecionado ? (
            <p className="text-[11.5px] text-fantasma">Clique em um nó do mapa.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="font-mono text-[12px] text-pleno">{selecionado.rotulo}</p>
                <div className="mt-1.5">
                  <StatusBadge tom={COR[selecionado.tipo].tom}>
                    {ROTULO_TIPO_NO[selecionado.tipo]}
                  </StatusBadge>
                </div>
              </div>

              <dl className="space-y-2 text-[11.5px]">
                <Linha rotulo="Palavra alvo" valor={selecionado.palavra_alvo} />
                <Linha rotulo="Escopo" valor={selecionado.escopo} />
                <Linha rotulo="Telefone" valor={selecionado.telefone} mono />
                <Linha
                  rotulo="Tráfego/mês"
                  valor={selecionado.trafego_mes?.toLocaleString('pt-BR') ?? null}
                  mono
                />
                <Linha
                  rotulo="Leads 30 d"
                  valor={selecionado.leads_30d?.toLocaleString('pt-BR') ?? null}
                  mono
                />
              </dl>

              {selecionado.url && (
                <a
                  href={selecionado.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate font-mono text-[10.5px] text-ciano-claro hover:underline"
                >
                  {selecionado.url}
                </a>
              )}
            </div>
          )}
        </Painel>

        <Painel
          titulo="Canibalização"
          nota={`${canibalizacoes.length} conflito(s)`}
          acento={canibalizacoes.length > 0 ? 'magenta' : 'nenhum'}
          densidade="card"
        >
          {canibalizacoes.length === 0 ? (
            <p className="text-[11.5px] text-fantasma">
              Nenhuma página brigando pela mesma palavra.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {canibalizacoes.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setSelecionadoId(n.id)}
                    className="w-full text-left font-mono text-[10.5px] text-magenta-claro hover:underline"
                  >
                    {n.rotulo}
                    {n.palavra_alvo && (
                      <span className="block text-fantasma">{n.palavra_alvo}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Painel>

        <Painel
          titulo="Buracos de cobertura"
          nota={`${buracos.length} palavra(s) sem página`}
          acento={buracos.length > 0 ? 'ambar' : 'nenhum'}
          densidade="card"
        >
          {buracos.length === 0 ? (
            <p className="text-[11.5px] text-fantasma">Cobertura sem lacuna conhecida.</p>
          ) : (
            <ul className="space-y-1.5">
              {buracos.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setSelecionadoId(n.id)}
                    className="w-full text-left font-mono text-[10.5px] text-ambar hover:underline"
                  >
                    {n.rotulo}
                    {n.palavra_alvo && (
                      <span className="block text-fantasma">{n.palavra_alvo}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Painel>
      </div>
    </div>
  )
}

function Linha({
  rotulo,
  valor,
  mono,
}: {
  rotulo: string
  valor: string | null
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-tenue">{rotulo}</dt>
      <dd className={mono ? 'font-mono text-[11px] text-corpo' : 'text-corpo'}>
        {valor ?? <span className="text-fantasma">—</span>}
      </dd>
    </div>
  )
}

function BotaoZoom({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid size-7 cursor-pointer place-items-center rounded-btn border border-borda bg-vidro font-mono text-[12px] text-tenue transition-colors hover:border-azul/45 hover:text-corpo"
    >
      {children}
    </button>
  )
}

import { NextResponse } from 'next/server'
import { htmlParaPdf } from '@/lib/pdf'
import { formatBRL } from '@/lib/money'
import { montarRelatorio, SECOES, type SecaoRelatorio } from '@/lib/relatorio'
import { ROTULO_CANAL } from '@/lib/crm'
import { ROTULO_FRENTE } from '@/lib/db'

export const dynamic = 'force-dynamic'

function escapar(t: string): string {
  return t.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
}

function tabela(cabecalho: string[], linhas: string[][]): string {
  return `<table><thead><tr>${cabecalho
    .map((c) => `<th>${escapar(c)}</th>`)
    .join('')}</tr></thead><tbody>${linhas
    .map((l) => `<tr>${l.map((c) => `<td>${escapar(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`
}

/**
 * PDF do relatório mensal. Reaproveita o mesmo Gotenberg dos contratos —
 * sem GOTENBERG_URL a rota responde 503 explicando, em vez de devolver um
 * arquivo vazio.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ clienteId: string }> },
) {
  const { clienteId } = await params
  const url = new URL(request.url)
  const mes = url.searchParams.get('mes') ?? undefined
  const pedidas = url.searchParams.get('secoes')
  const on = new Set<SecaoRelatorio>(
    pedidas === null
      ? SECOES.map((s) => s.chave)
      : (pedidas.split(',').filter(Boolean) as SecaoRelatorio[]),
  )

  const r = await montarRelatorio(clienteId, mes)
  if (!r) {
    return NextResponse.json({ erro: 'Cliente não encontrado.' }, { status: 404 })
  }

  const blocos: string[] = [
    `<h1>Relatório mensal · ${escapar(r.cliente.nome)}</h1>`,
    `<p class="meta">${escapar(r.mes.rotulo)} · saúde da conta ${r.saude}%</p>`,
    tabela(
      ['Indicador', 'Valor'],
      [
        ['Receita paga no mês', formatBRL(r.receita.pagoCentavos)],
        ['A receber no mês', formatBRL(r.receita.aReceberCentavos)],
        ['Em atraso', `${formatBRL(r.receita.atrasoCentavos)} (${r.receita.atrasoQtd})`],
        ['Leads', `${r.leads.total} (${r.leads.respondidos} respondidos)`],
        ['Conversas', `${r.conversas.total} (${r.conversas.abertas} abertas)`],
      ],
    ),
  ]

  if (on.has('receita')) {
    blocos.push(
      '<h2>Receita · 6 meses</h2>',
      tabela(
        ['Mês', 'Recebido'],
        r.receita.porMes.map((m) => [m.rotulo, formatBRL(m.centavos)]),
      ),
    )
  }

  if (on.has('leads') && r.leads.porLanding.length > 0) {
    blocos.push(
      '<h2>Leads por landing</h2>',
      tabela(
        ['Landing', 'Leads'],
        r.leads.porLanding.map((l) => [l.landing, String(l.qtd)]),
      ),
    )
  }

  if (on.has('conversas') && r.conversas.porCanal.length > 0) {
    blocos.push(
      '<h2>Conversas por canal</h2>',
      tabela(
        ['Canal', 'Conversas'],
        r.conversas.porCanal.map((c) => [ROTULO_CANAL[c.canal] ?? c.canal, String(c.qtd)]),
      ),
    )
  }

  if (on.has('dominios') && r.dominios.lista.length > 0) {
    blocos.push(
      '<h2>Domínios e sites</h2>',
      tabela(
        ['Domínio', 'Vencimento', 'SSL'],
        r.dominios.lista.map((d) => [
          d.dominio,
          d.expira_em ? new Date(d.expira_em).toLocaleDateString('pt-BR') : '—',
          d.ssl_expira ? new Date(d.ssl_expira).toLocaleDateString('pt-BR') : '—',
        ]),
      ),
    )
  }

  if (on.has('contratos') && r.contratos.lista.length > 0) {
    blocos.push(
      '<h2>Contratos</h2>',
      tabela(
        ['Código', 'Frente', 'Situação', 'Valor'],
        r.contratos.lista.map((c) => [
          c.codigo,
          ROTULO_FRENTE[c.frente],
          c.status,
          formatBRL(c.valor_centavos),
        ]),
      ),
    )
  }

  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Relatório mensal · ${escapar(r.cliente.nome)}</title>
    <style>
      @page { size: A4; margin: 18mm 16mm; }
      body { font-family: Helvetica, Arial, sans-serif; font-size: 10.5pt; color: #12151d; }
      h1 { font-size: 17pt; margin: 0 0 2mm; }
      h2 { font-size: 12pt; margin: 8mm 0 2mm; }
      .meta { color: #5a6072; margin: 0 0 6mm; }
      table { width: 100%; border-collapse: collapse; margin: 3mm 0; }
      th, td { border: 1px solid #d5d2c8; padding: 2mm 3mm; text-align: left; }
      th { background: #f3f2ee; font-size: 9pt; text-transform: uppercase; letter-spacing: .06em; }
    </style>
  </head>
  <body>${blocos.join('')}</body>
</html>`

  try {
    const pdf = await htmlParaPdf(html)
    const arquivo = `relatorio-${r.cliente.nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .toLowerCase()}-${r.mes.inicio.slice(0, 7)}.pdf`

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${arquivo}"`,
      },
    })
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : 'Falha ao gerar o PDF.' },
      { status: 503 },
    )
  }
}

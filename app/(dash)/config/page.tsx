import { FormSite } from '@/components/FormSite'
import { FormTemplate } from '@/components/FormTemplate'
import { FrenteTag } from '@/components/FrenteTag'
import { Painel, Vazio } from '@/components/Painel'
import { SnippetLead } from '@/components/SnippetLead'
import { Celula, Linha, Tabela } from '@/components/Tabela'
import type { Cliente, Site, TemplateContrato, UsuarioMaster } from '@/lib/db'
import { ROTULO_TIPO } from '@/lib/db'
import { formatData } from '@/lib/money'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/** Estado das integrações — nunca exibimos o valor das chaves, só se existem. */
const INTEGRACOES = [
  { nome: 'Asaas · API', variavel: 'ASAAS_API_KEY' },
  { nome: 'Asaas · webhook', variavel: 'ASAAS_WEBHOOK_TOKEN' },
  { nome: 'ZapSign · API', variavel: 'ZAPSIGN_TOKEN' },
  { nome: 'ZapSign · webhook', variavel: 'ZAPSIGN_WEBHOOK_TOKEN' },
  { nome: 'Supabase · service role', variavel: 'SUPABASE_SERVICE_ROLE_KEY' },
  { nome: 'Gotenberg (PDF)', variavel: 'GOTENBERG_URL' },
  { nome: 'Cron', variavel: 'CRON_SECRET' },
  { nome: 'Gemini · expansão de segmento', variavel: 'GEMINI_API_KEY' },
]

export default async function Config() {
  const supabase = await supabaseServidor()
  const [{ data: templates }, { data: usuarios }, { data: sites }, { data: clientes }] =
    await Promise.all([
      supabase.from('templates_contrato').select('*').order('nome'),
      supabase.from('usuarios_master').select('*').order('nome'),
      supabase.from('sites').select('*').order('dominio'),
      supabase.from('clientes').select('id, nome').order('nome'),
    ])

  const listaClientes = (clientes ?? []) as Pick<Cliente, 'id' | 'nome'>[]

  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-marfim">Configurações</h1>
        <p className="text-sm text-apagado">Templates, integrações, usuários e sites.</p>
      </header>

      <Painel titulo="Templates de contrato" acao={<FormTemplate />}>
        {((templates ?? []) as TemplateContrato[]).length === 0 ? (
          <Vazio>
            Nenhum template. Cole o modelo de cada tipo de contrato em HTML com as merge tags.
          </Vazio>
        ) : (
          <Tabela cabecalho={['Nome', 'Frente', 'Tipo', 'Ativo', 'Criado']}>
            {(templates as TemplateContrato[]).map((t) => (
              <Linha key={t.id}>
                <Celula>{t.nome}</Celula>
                <Celula>{t.frente ? <FrenteTag frente={t.frente} /> : '—'}</Celula>
                <Celula>{t.tipo ? (ROTULO_TIPO[t.tipo] ?? t.tipo) : '—'}</Celula>
                <Celula>{t.ativo ? '✓' : '×'}</Celula>
                <Celula>{formatData(t.criado_em)}</Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Painel>

      <Painel titulo="Integrações">
        <Tabela cabecalho={['Integração', 'Variável', 'Estado']}>
          {INTEGRACOES.map((i) => {
            const configurada = Boolean(process.env[i.variavel])
            return (
              <Linha key={i.variavel}>
                <Celula>{i.nome}</Celula>
                <Celula>
                  <span className="font-mono text-xs text-nevoa">{i.variavel}</span>
                </Celula>
                <Celula>
                  {configurada ? (
                    <span className="text-ok">✓ configurada</span>
                  ) : (
                    <span className="text-alerta">! ausente</span>
                  )}
                </Celula>
              </Linha>
            )
          })}
        </Tabela>
        <p className="mt-4 text-[11px] text-apagado">
          As chaves ficam apenas nas variáveis de ambiente da Vercel — o Master mostra só se
          estão presentes, nunca o valor.
        </p>
      </Painel>

      <Painel titulo="Usuários">
        {((usuarios ?? []) as UsuarioMaster[]).length === 0 ? (
          <Vazio>
            Convide os sócios pelo painel de Auth do Supabase; o perfil aparece aqui depois do
            primeiro acesso.
          </Vazio>
        ) : (
          <Tabela cabecalho={['Nome', 'Papel', 'Desde']}>
            {(usuarios as UsuarioMaster[]).map((u) => (
              <Linha key={u.id}>
                <Celula>{u.nome ?? '—'}</Celula>
                <Celula>{u.papel}</Celula>
                <Celula>{formatData(u.criado_em)}</Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Painel>

      <Painel
        titulo="Sites e captação de leads"
        acao={<FormSite clientes={listaClientes} />}
      >
        {((sites ?? []) as Site[]).length === 0 ? (
          <Vazio>Cadastre os domínios dos clientes para gerar as chaves de formulário.</Vazio>
        ) : (
          <div className="space-y-8">
            {(sites as Site[]).map((s) => (
              <div key={s.id}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-marfim">
                    {s.dominio}
                    <span className="ml-2 font-mono text-[11px] text-apagado">
                      {s.site_key}
                    </span>
                  </p>
                  <FormSite clientes={listaClientes} site={s} />
                </div>
                <SnippetLead siteKey={s.site_key} base={base} />
              </div>
            ))}
          </div>
        )}
      </Painel>
    </div>
  )
}

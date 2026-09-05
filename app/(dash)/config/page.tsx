import { BotaoLink } from '@/components/Campo'
import { CabecalhoTela } from '@/components/CabecalhoTela'
import { FormSite } from '@/components/FormSite'
import { FormTemplate } from '@/components/FormTemplate'
import { FrenteTag } from '@/components/FrenteTag'
import { Painel, Vazio } from '@/components/Painel'
import { SnippetLead } from '@/components/SnippetLead'
import { StatusBadge } from '@/components/StatusBadge'
import { Celula, Linha, Tabela } from '@/components/Tabela'
import type { Cliente, Site, TemplateContrato } from '@/lib/db'
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
  const [{ data: templates }, { count: qtdUsuarios }, { data: sites }, { data: clientes }] =
    await Promise.all([
      supabase.from('templates_contrato').select('*').order('nome'),
      supabase.from('usuarios_master').select('id', { count: 'exact', head: true }),
      supabase.from('sites').select('*').order('dominio'),
      supabase.from('clientes').select('id, nome').order('nome'),
    ])

  const listaClientes = (clientes ?? []) as Pick<Cliente, 'id' | 'nome'>[]

  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const ausentes = INTEGRACOES.filter((i) => !process.env[i.variavel]).length

  return (
    <div className="space-y-3.5">
      <CabecalhoTela
        titulo="Configurações da conta"
        meta={`Templates, credenciais e sites · ${INTEGRACOES.length - ausentes} de ${INTEGRACOES.length} integrações configuradas`}
        acoes={<BotaoLink href="/integracoes">Integrações e coleta →</BotaoLink>}
      />

      <Painel titulo="Templates de contrato" acao={<FormTemplate />}>
        {((templates ?? []) as TemplateContrato[]).length === 0 ? (
          <Vazio descricao="Cole o modelo de cada tipo de contrato em HTML com as merge tags.">
            Nenhum template de contrato
          </Vazio>
        ) : (
          <Tabela cabecalho={['Nome', 'Frente', 'Tipo', 'Situação', 'Criado']}>
            {(templates as TemplateContrato[]).map((t) => (
              <Linha key={t.id}>
                <Celula>{t.nome}</Celula>
                <Celula>{t.frente ? <FrenteTag frente={t.frente} /> : '—'}</Celula>
                <Celula>{t.tipo ? (ROTULO_TIPO[t.tipo] ?? t.tipo) : '—'}</Celula>
                <Celula>
                  <StatusBadge tom={t.ativo ? 'verde' : 'neutro'}>
                    {t.ativo ? 'ativo' : 'inativo'}
                  </StatusBadge>
                </Celula>
                <Celula mono>{formatData(t.criado_em)}</Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Painel>

      <Painel
        titulo="Credenciais"
        nota="As chaves ficam só nas variáveis de ambiente — o Master mostra se existem, nunca o valor"
      >
        <Tabela cabecalho={['Integração', 'Variável', 'Estado']}>
          {INTEGRACOES.map((i) => {
            const configurada = Boolean(process.env[i.variavel])
            return (
              <Linha key={i.variavel}>
                <Celula>{i.nome}</Celula>
                <Celula mono>{i.variavel}</Celula>
                <Celula>
                  <StatusBadge tom={configurada ? 'verde' : 'ambar'}>
                    {configurada ? 'configurada' : 'ausente'}
                  </StatusBadge>
                </Celula>
              </Linha>
            )
          })}
        </Tabela>
      </Painel>

      <Painel
        titulo="Equipe"
        nota={`${qtdUsuarios ?? 0} conta(s) com acesso ao painel`}
        acao={<BotaoLink href="/usuarios">Usuários e permissões →</BotaoLink>}
      >
        <p className="text-[12.5px] leading-relaxed text-suave">
          Perfis, 2FA e último acesso agora vivem na tela de{' '}
          <span className="text-corpo">Usuários e permissões</span>. Entrar no projeto do
          Supabase não basta: a conta precisa estar em{' '}
          <code className="font-mono text-mono">usuarios_master</code> para a RLS liberar
          contratos, cobranças e leads.
        </p>
      </Painel>

      <Painel
        titulo="Sites e captação de leads"
        acao={<FormSite clientes={listaClientes} />}
      >
        {((sites ?? []) as Site[]).length === 0 ? (
          <Vazio>Cadastre os domínios dos clientes para gerar as chaves de formulário</Vazio>
        ) : (
          <div className="space-y-8">
            {(sites as Site[]).map((s) => (
              <div key={s.id}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] text-pleno">
                    <span className="font-mono">{s.dominio}</span>
                    <span className="ml-2 font-mono text-[10.5px] text-fantasma">
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

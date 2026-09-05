import { AcoesUsuario } from '@/components/AcoesUsuario'
import { Avatar } from '@/components/Avatar'
import { BotaoLink } from '@/components/Campo'
import { BarraFiltros, CabecalhoTela } from '@/components/CabecalhoTela'
import { ChipLink } from '@/components/Chip'
import { KpiTile } from '@/components/KpiTile'
import { Painel, Vazio } from '@/components/Painel'
import { StatusBadge, type TomBadge } from '@/components/StatusBadge'
import { Celula, Linha, Tabela } from '@/components/Tabela'
import type { UsuarioMaster } from '@/lib/db'
import { supabaseAdmin, supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const TOM_PAPEL: Record<string, TomBadge> = {
  admin: 'roxo',
  operador: 'azul',
}

type Pessoa = UsuarioMaster & {
  email: string | null
  ultimoAcesso: string | null
  doisFatores: boolean
}

/**
 * E-mail, último acesso e 2FA vivem em auth.users, não em usuarios_master.
 * Só buscamos as contas que já estão na equipe — o projeto também hospeda
 * clientes finais do HAYA APP, que não têm nada a ver com esta tela.
 */
async function enriquecer(equipe: UsuarioMaster[]): Promise<Pessoa[]> {
  const vazio = equipe.map((u) => ({
    ...u,
    email: null,
    ultimoAcesso: null,
    doisFatores: false,
  }))

  try {
    const { data } = await supabaseAdmin().auth.admin.listUsers({ perPage: 200 })
    const porId = new Map(data.users.map((u) => [u.id, u]))
    return equipe.map((u) => {
      const conta = porId.get(u.id)
      return {
        ...u,
        email: conta?.email ?? null,
        ultimoAcesso: conta?.last_sign_in_at ?? null,
        doisFatores: (conta?.factors ?? []).some((f) => f.status === 'verified'),
      }
    })
  } catch {
    // Sem service role configurada a tela ainda lista a equipe, sem os extras.
    return vazio
  }
}

function quando(iso: string | null): string {
  if (!iso) return 'nunca entrou'
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 36e5)
  if (h < 1) return 'agora há pouco'
  if (h < 24) return `há ${h} h`
  return `há ${Math.round(h / 24)} d`
}

export default async function Usuarios({
  searchParams,
}: {
  searchParams: Promise<{ perfil?: string }>
}) {
  const { perfil } = await searchParams
  const supabase = await supabaseServidor()

  const [{ data: equipe }, { data: sessao }] = await Promise.all([
    supabase.from('usuarios_master').select('*').order('criado_em'),
    supabase.auth.getUser(),
  ])

  const pessoas = await enriquecer((equipe ?? []) as UsuarioMaster[])
  const eu = sessao.user?.id ?? null

  const admins = pessoas.filter((p) => p.papel === 'admin').length
  const com2fa = pessoas.filter((p) => p.doisFatores).length

  const filtro = perfil === 'admin' || perfil === 'operador' ? perfil : undefined
  const lista = filtro ? pessoas.filter((p) => p.papel === filtro) : pessoas

  return (
    <div className="space-y-3.5">
      <CabecalhoTela
        titulo="Usuários e permissões"
        meta="Quem entra no Master vem de usuarios_master — estar logado no projeto não basta"
      />

      <div className="grid gap-3.5 sm:grid-cols-3">
        <KpiTile
          rotulo="Na equipe"
          valor={String(pessoas.length)}
          acento="azul"
          detalhe={<span>contas com acesso ao painel</span>}
        />
        <KpiTile
          rotulo="Admins"
          valor={String(admins)}
          acento="roxo"
          detalhe={<span>podem alterar perfis e remover acessos</span>}
        />
        <KpiTile
          rotulo="Com 2FA"
          valor={`${com2fa}/${pessoas.length}`}
          acento={com2fa < admins ? 'ambar' : 'verde'}
          detalhe={<span>obrigatório para perfis admin</span>}
        />
      </div>

      <Painel
        titulo="Equipe"
        acao={
          <span className="font-mono text-[10.5px] text-fantasma">
            {lista.length} de {pessoas.length}
          </span>
        }
      >
        <div className="mb-4">
          <BarraFiltros>
            <ChipLink href="/usuarios" ativo={!filtro} scroll={false}>
              todos · {pessoas.length}
            </ChipLink>
            <ChipLink
              href={filtro === 'admin' ? '/usuarios' : '/usuarios?perfil=admin'}
              ativo={filtro === 'admin'}
              scroll={false}
            >
              admin · {admins}
            </ChipLink>
            <ChipLink
              href={filtro === 'operador' ? '/usuarios' : '/usuarios?perfil=operador'}
              ativo={filtro === 'operador'}
              scroll={false}
            >
              operador · {pessoas.length - admins}
            </ChipLink>
          </BarraFiltros>
        </div>

        {lista.length === 0 ? (
          <Vazio acao={<BotaoLink href="/usuarios">Ver todos</BotaoLink>}>
            Nenhuma conta nesse perfil
          </Vazio>
        ) : (
          <Tabela
            cabecalho={[
              'Pessoa',
              'E-mail',
              'Perfil',
              '2FA',
              'Último acesso',
              { rotulo: 'Ações', numerica: true },
            ]}
            minima="48rem"
          >
            {lista.map((p) => (
              <Linha key={p.id}>
                <Celula>
                  <span className="flex items-center gap-2.5">
                    <Avatar nome={p.nome ?? p.email ?? '?'} tamanho={30} />
                    <span className="truncate text-pleno">{p.nome ?? 'Sem nome'}</span>
                  </span>
                </Celula>
                <Celula mono>{p.email ?? '—'}</Celula>
                <Celula>
                  <StatusBadge tom={TOM_PAPEL[p.papel] ?? 'neutro'}>{p.papel}</StatusBadge>
                </Celula>
                <Celula>
                  <StatusBadge tom={p.doisFatores ? 'verde' : 'ambar'}>
                    {p.doisFatores ? '2fa ativo' : 'sem 2fa'}
                  </StatusBadge>
                </Celula>
                <Celula mono>{quando(p.ultimoAcesso)}</Celula>
                <Celula numerica>
                  <AcoesUsuario id={p.id} papel={p.papel} ehVoce={p.id === eu} />
                </Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Painel>

      <Painel titulo="Como alguém entra na equipe">
        <ol className="space-y-2 text-[12.5px] text-suave">
          <li>
            1. A pessoa cria a conta pelo login normal do painel (ou recebe um convite
            pelo Supabase Auth).
          </li>
          <li>
            2. Um admin insere o <code className="font-mono text-mono">id</code> dela em{' '}
            <code className="font-mono text-mono">usuarios_master</code> com o perfil
            desejado.
          </li>
          <li>
            3. A RLS passa a liberar contratos, cobranças e leads. Sem esse registro, a
            conta cai em <code className="font-mono text-mono">/sem-acesso</code>.
          </li>
        </ol>
      </Painel>
    </div>
  )
}

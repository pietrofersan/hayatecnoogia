-- Fecha a porta de entrada automática no workspace do CRM.
--
-- O app CRM separado (omnicrm → haya-app, hoje parado) tinha cadastro público:
-- depois do signUp ele chamava public.join_default_workspace(), uma função
-- SECURITY DEFINER que insere quem chamou em workspace_members do workspace
-- 00000000-0000-0000-0000-000000000001 — o mesmo que o módulo CRM do Master
-- usa (lib/crm.ts). Como as policies do CRM liberam por
-- private.is_workspace_member(), qualquer conta autenticada neste projeto
-- Supabase podia chamar a função direto pela anon key (que é pública, vai no
-- bundle do navegador) e virar membro — admin, inclusive, enquanto o workspace
-- estivesse vazio — dos dados reais de conversas e contatos.
--
-- No Master o acesso ao CRM é por public.is_master(); ninguém precisa dessa
-- função. Ela fica no banco só como histórico, sem poder ser executada.

do $$
begin
  if to_regprocedure('public.join_default_workspace()') is not null then
    revoke execute on function public.join_default_workspace() from public, anon, authenticated;
  end if;
end
$$;

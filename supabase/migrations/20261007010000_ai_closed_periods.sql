-- Recesso / dias fechados do buffet (Configurar IA): sem festas, sem visitas e
-- sem atendimento da equipe nesses dias. A IA continua respondendo, mas não
-- oferece essas datas; o formulário do site deixa esses dias bloqueados.
alter table public.ai_agent_settings
  add column if not exists closed_periods jsonb not null default '[]'::jsonb;

-- Leitura pública só das datas fechadas (o formulário do site não tem login)
create or replace function public.public_closed_periods(p_company_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select closed_periods from public.ai_agent_settings where company_id = p_company_id),
    '[]'::jsonb
  )
$$;

grant execute on function public.public_closed_periods(uuid) to anon, authenticated;

-- Castelo da Diversão: recesso de 23/12/2026 a 03/01/2027
update public.ai_agent_settings
  set closed_periods = '[{"start": "2026-12-23", "end": "2027-01-03"}]'::jsonb
  where company_id = 'a0000000-0000-0000-0000-000000000001'
    and closed_periods = '[]'::jsonb;

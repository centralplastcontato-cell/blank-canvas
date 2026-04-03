
create table public.company_card_fees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade not null,
  operator_name text not null,
  antecipado boolean default false,
  taxa_debito numeric(5,2) default 0,
  taxa_credito_1x numeric(5,2) default 0,
  taxa_credito_2x numeric(5,2) default 0,
  taxa_credito_3x numeric(5,2) default 0,
  taxa_credito_4x numeric(5,2) default 0,
  taxa_credito_5x numeric(5,2) default 0,
  taxa_credito_6x numeric(5,2) default 0,
  taxa_credito_7x numeric(5,2) default 0,
  taxa_credito_8x numeric(5,2) default 0,
  taxa_credito_9x numeric(5,2) default 0,
  taxa_credito_10x numeric(5,2) default 0,
  taxa_credito_11x numeric(5,2) default 0,
  taxa_credito_12x numeric(5,2) default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.company_card_fees enable row level security;

create policy "Users can manage own company card fees"
  on public.company_card_fees for all
  to authenticated
  using (company_id = any(public.get_user_company_ids(auth.uid())))
  with check (company_id = any(public.get_user_company_ids(auth.uid())));

create trigger update_company_card_fees_updated_at
  before update on public.company_card_fees
  for each row
  execute function public.update_updated_at_column();

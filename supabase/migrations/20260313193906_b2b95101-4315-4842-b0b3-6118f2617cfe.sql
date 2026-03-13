
create table public.hub_recruitment_responses (
  id uuid primary key default gen_random_uuid(),
  respondent_name text not null,
  age integer,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

alter table public.hub_recruitment_responses enable row level security;

create policy "Anyone can insert recruitment responses"
  on public.hub_recruitment_responses
  for insert
  to anon, authenticated
  with check (true);

create policy "Admins can read recruitment responses"
  on public.hub_recruitment_responses
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

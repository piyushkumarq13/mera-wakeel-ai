create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  citizen_id text not null,
  citizen_email text,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_reply text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: citizen can only read their own tickets
alter table support_tickets enable row level security;

create policy "citizens_read_own_tickets"
  on support_tickets for select
  using (citizen_id = auth.uid()::text or citizen_id = current_setting('request.jwt.claims', true)::json->>'sub');
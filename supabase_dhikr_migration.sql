-- Run this in Supabase Dashboard → SQL Editor

create table if not exists dhikr_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade,
  date         date not null,
  dhikr_id     text not null,
  dhikr_name   text not null,
  arabic       text default '',
  count        integer default 0,
  target       integer default 33,
  unique(user_id, date, dhikr_id)
);

alter table dhikr_sessions enable row level security;

drop policy if exists "Users manage own dhikr" on dhikr_sessions;
create policy "Users manage own dhikr" on dhikr_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.dhikr_sessions to authenticated;

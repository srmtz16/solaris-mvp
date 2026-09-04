-- Run in Supabase SQL Editor. Adds requests without changing the four existing tables.
begin;

create table if not exists public.client_requests (
  id uuid primary key default gen_random_uuid(),
  system_record_id bigint not null references public."Sistemas"(id),
  system_id text not null,
  request_type text not null check (request_type in ('maintenance', 'failure')),
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  phone text not null check (char_length(phone) between 7 and 30),
  email text check (char_length(email) <= 254),
  message text not null check (char_length(message) between 5 and 1500),
  preferred_date date,
  status text not null default 'new' check (status in ('new', 'contacted', 'scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_requests enable row level security;
revoke all on public.client_requests from public, anon, authenticated;
grant select on public.client_requests to authenticated;
grant update (status) on public.client_requests to authenticated;

-- A signed-in account is NOT automatically an administrator.
drop policy if exists "Public can create client requests" on public.client_requests;
drop policy if exists "Authenticated administrators can read requests" on public.client_requests;
drop policy if exists "Authenticated administrators can update requests" on public.client_requests;
create policy "Authenticated administrators can read requests"
  on public.client_requests for select to authenticated
  using ((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin');
create policy "Authenticated administrators can update requests"
  on public.client_requests for update to authenticated
  using ((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin')
  with check ((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin');

create index if not exists client_requests_system_record_idx on public.client_requests (system_record_id);
create index if not exists client_requests_created_at_idx on public.client_requests (created_at desc);
create index if not exists client_requests_submission_idx on public.client_requests (system_record_id, phone, created_at desc);

-- Public access is restricted to submission. No client details are returned.
create or replace function public.submit_client_request(
  p_system_code text,
  p_request_type text,
  p_customer_name text,
  p_phone text,
  p_email text,
  p_message text,
  p_preferred_date date
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_system_id bigint;
  v_matches bigint;
  v_request_id uuid;
begin
  p_system_code := btrim(p_system_code);
  p_customer_name := btrim(p_customer_name);
  p_phone := btrim(p_phone);
  p_message := btrim(p_message);
  p_email := nullif(btrim(p_email), '');
  if p_system_code is null or p_system_code !~ '^FV-[0-9]{4,}$'
    or p_request_type is null or p_request_type not in ('maintenance', 'failure')
    or p_customer_name is null or char_length(p_customer_name) not between 2 and 100
    or p_phone is null or char_length(p_phone) not between 7 and 30
    or p_message is null or char_length(p_message) not between 5 and 1500
    or (p_email is not null and (char_length(p_email) > 254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'))
    or (p_request_type = 'failure' and p_preferred_date is not null)
  then
    raise exception using errcode = '22023', message = 'Invalid request';
  end if;

  select count(*), min(s.id) into v_matches, v_system_id
  from public."Sistemas" s where s.system_code = p_system_code;
  if v_matches <> 1 then
    raise exception using errcode = '22023', message = 'System unavailable';
  end if;

  -- Serializes matching submissions and reduces accidental duplicate requests.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_system_code), pg_catalog.hashtext(p_phone));
  if exists (
    select 1 from public.client_requests r
    where r.system_record_id = v_system_id and r.phone = p_phone
      and r.created_at > now() - interval '5 minutes'
  ) then
    raise exception using errcode = 'P0001', message = 'Please wait before submitting another request';
  end if;

  insert into public.client_requests (
    system_record_id, system_id, request_type, customer_name, phone, email, message, preferred_date
  ) values (
    v_system_id, p_system_code, p_request_type, p_customer_name, p_phone, p_email, p_message, p_preferred_date
  ) returning id into v_request_id;
  return v_request_id;
end;
$$;

revoke all on function public.submit_client_request(text, text, text, text, text, text, date) from public;
grant execute on function public.submit_client_request(text, text, text, text, text, text, date) to anon;
notify pgrst, 'reload schema';
commit;

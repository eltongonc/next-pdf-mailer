-- Apply once to an empty PostgreSQL database using psql.
begin;
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create table public.auth_attempts (
  email_hash text primary key,
  attempts integer not null,
  window_start timestamptz not null
);
create table public.sessions (
  hash text primary key,
  owner_id uuid not null references public.users on delete cascade,
  expires_at timestamptz not null
);
create index on public.sessions(owner_id);
create index on public.sessions(expires_at);
create table public.templates (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.users on delete cascade,
  name text not null, html text not null, variables jsonb not null default '[]', sample_data jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.api_keys (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.users on delete cascade,
  name text not null, hash text unique not null, prefix text not null, created_at timestamptz not null default now(), revoked_at timestamptz
);
create table public.deliveries (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.users on delete cascade,
  template_id uuid references public.templates on delete set null, template_name text not null, recipient text not null,
  status text not null check (status in ('processing','accepted','delivered','bounced','failed')), error text,
  provider_id text unique, idempotency_key text not null, request_hash text not null, created_at timestamptz not null default now(),
  unique(owner_id, idempotency_key)
);
create index on public.templates(owner_id);
create index on public.api_keys(owner_id);
create index on public.deliveries(owner_id, created_at desc);
create function public.reserve_delivery(p_owner uuid, p_key text, p_hash text, p_template uuid, p_name text, p_recipient text)
returns jsonb language plpgsql set search_path = '' as $$
declare existing public.deliveries; delivery_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text, 0));
  select * into existing from public.deliveries where owner_id = p_owner and idempotency_key = p_key;
  if found then
    return jsonb_build_object('existing', true, 'conflict', existing.request_hash <> p_hash, 'id', existing.id, 'status', existing.status);
  end if;
  if (select count(*) from public.deliveries where owner_id = p_owner and created_at > now() - interval '1 minute') >= 20 then
    return jsonb_build_object('limited', true);
  end if;
  insert into public.deliveries(owner_id, template_id, template_name, recipient, status, idempotency_key, request_hash)
    values(p_owner, p_template, p_name, p_recipient, 'processing', p_key, p_hash) returning id into delivery_id;
  return jsonb_build_object('id', delivery_id, 'status', 'processing', 'existing', false);
end;
$$;

commit;

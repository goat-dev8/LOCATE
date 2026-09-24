do $$ begin
  create type locate.thesis_kind as enum
    ('premium_compression','relative_valuation','mean_reversion','event_driven','other');
exception
  when duplicate_object then null;
end $$;

create table if not exists locate.theses (
  id                       uuid primary key default gen_random_uuid(),
  cluster                  text not null check (cluster in ('devnet','mainnet-beta','localnet')),
  wallet                   text not null,
  mint                     text not null,
  offer                    text,
  kind                     locate.thesis_kind not null,
  note                     text not null check (char_length(note) <= 140),
  current_premium_bps      integer,
  target_premium_bps       integer,
  acknowledged_non_binding boolean not null check (acknowledged_non_binding),
  signature                text,
  created_at               timestamptz not null default now()
);

alter table locate.theses enable row level security;
revoke all on all tables in schema locate from anon, authenticated, public;

insert into locate.schema_migrations(version) values ('002') on conflict do nothing;

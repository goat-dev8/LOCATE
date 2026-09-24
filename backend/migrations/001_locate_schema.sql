create schema if not exists locate;

create table if not exists locate.schema_migrations (
  version     text primary key,
  applied_at  timestamptz not null default now()
);

do $$ begin
  create type locate.event_kind as enum
    ('offer_created','offer_cancelled','loan_taken','loan_returned','loan_claimed');
exception
  when duplicate_object then null;
end $$;

create table if not exists locate.receipts (
  signature        text        not null,
  event_index      smallint    not null,
  cluster          text        not null check (cluster in ('devnet','mainnet-beta','localnet')),
  program_id       text        not null,
  kind             locate.event_kind not null,
  slot             bigint      not null,
  block_time       timestamptz,
  offer            text,
  loan             text,
  lender           text,
  borrower         text,
  mint             text,
  amount_raw       numeric(20,0),
  collateral_usdc  numeric(20,0),
  fee_usdc         numeric(20,0),
  gross_raw        numeric(20,0),
  net_received_raw numeric(20,0),
  borrower_received_raw numeric(20,0),
  fee_bps          integer,
  maturity_ts      timestamptz,
  claim_after_ts   timestamptz,
  claimed_by       text,
  lender_delta_raw numeric(20,0),
  commitment       text        not null check (commitment in ('confirmed','finalized')),
  source           text        not null check (source in ('client_submit','catchup','script')),
  label            text        check (label in ('self_originated_demo')),
  raw_event        jsonb       not null,
  verified_at      timestamptz not null default now(),
  primary key (signature, event_index)
);

create index if not exists receipts_lender_idx   on locate.receipts (cluster, lender, slot desc);
create index if not exists receipts_borrower_idx on locate.receipts (cluster, borrower, slot desc);
create index if not exists receipts_loan_idx     on locate.receipts (loan);
create index if not exists receipts_offer_idx    on locate.receipts (offer);

create table if not exists locate.ingest_cursor (
  cluster        text not null,
  program_id     text not null,
  last_signature text,
  last_slot      bigint,
  updated_at     timestamptz not null default now(),
  primary key (cluster, program_id)
);

alter table locate.receipts enable row level security;
alter table locate.ingest_cursor enable row level security;
alter table locate.schema_migrations enable row level security;

revoke all on schema locate from anon, authenticated;
revoke all on all tables in schema locate from anon, authenticated, public;

insert into locate.schema_migrations(version) values ('001') on conflict do nothing;

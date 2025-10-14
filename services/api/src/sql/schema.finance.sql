create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  amount_aed numeric not null,
  status text not null check (status in ('initiated','escrowed','released','refunded','flagged')),
  stripe_payment_id text,
  bank_escrow_ref text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_payments_user on payments(user_id);

-- 월 현금흐름: 매달 반복되는 고정 입출금(날짜별) + 달마다 시작 잔액·잉여 배분 계획

create table public.cash_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  -- 매달 몇 일 (그 달에 없는 날이면 말일로 계산)
  day int not null check (day between 1 and 31),
  amount bigint not null default 0 check (amount >= 0),
  -- income 수입 · living 생활비 · loan 대출 상환 · saving 저축/투자
  kind text not null check (kind in ('income', 'living', 'loan', 'saving')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index cash_items_household_idx on public.cash_items (household_id);

create table public.cash_months (
  household_id uuid not null references public.households (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  -- 비우면 직전 달 결산의 예적금 합계를 씀
  start_balance bigint check (start_balance is null or start_balance >= 0),
  -- 잉여 현금 배분 계획 {"비상금": 500000, ...}
  plan jsonb,
  updated_at timestamptz not null default now(),
  primary key (household_id, month)
);

alter table public.cash_items enable row level security;
alter table public.cash_months enable row level security;

create policy "members all cash_items" on public.cash_items
  for all to authenticated
  using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy "members all cash_months" on public.cash_months
  for all to authenticated
  using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));

alter publication supabase_realtime add table public.cash_items, public.cash_months;

-- 가치성장: 초기 스키마
-- 가구(부부) 단위로 데이터를 저장하고, 같은 가구 구성원만 읽고 쓸 수 있다(RLS).
-- 금액은 원 단위 정수(bigint). 달러 표시는 결산월 마감 환율(fx_rate)로 환산한다.

-- ───────── 가구 · 구성원 ─────────
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  -- 배우자가 합류할 때 쓰는 초대 코드 (대문자·숫자 8자리)
  invite_code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('husband', 'wife')),
  display_name text not null check (char_length(display_name) between 1 and 20),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  -- 한 사람은 한 가구에만, 가구 안에서 역할은 하나씩
  unique (user_id),
  unique (household_id, role)
);

-- ───────── 자산·부채 목록 ─────────
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  kind text not null check (kind in ('asset', 'liability')),
  name text not null check (char_length(name) between 1 and 40),
  -- 자산: 부동산·금융투자·예적금·연금·기타 / 부채: 주택담보대출·전세보증금·신용대출·기타대출
  category text not null check (
    (kind = 'asset' and category in ('부동산', '금융투자', '예적금', '연금', '기타'))
    or (kind = 'liability' and category in ('주택담보대출', '전세보증금', '신용대출', '기타대출'))
  ),
  owner text not null default 'joint' check (owner in ('joint', 'husband', 'wife')),
  -- 부채 금리(%), 자산은 null
  interest_rate numeric(6, 3) check (interest_rate is null or interest_rate >= 0),
  sort_order int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index accounts_household_idx on public.accounts (household_id);

-- ───────── 월별 결산 ─────────
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- 결산월: 매월 1일로 저장 (예: 2026-10-01 = 2026-10 결산)
  month date not null check (extract(day from month) = 1),
  status text not null default 'in_progress' check (status in ('in_progress', 'closed')),
  -- 마감 환율 (원/달러)
  fx_rate numeric(10, 2) check (fx_rate is null or fx_rate > 0),
  husband_confirmed_at timestamptz,
  wife_confirmed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, month)
);

-- 결산월별 자산·부채 잔액 (재무상태표의 원천)
create table public.account_balances (
  settlement_id uuid not null references public.settlements (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  amount bigint not null default 0 check (amount >= 0),
  primary key (settlement_id, account_id)
);

-- 손익 항목 (수입·고정지출·변동지출·투자 및 저축/상환)
create table public.pnl_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  grp text not null check (grp in ('income', 'fixed', 'variable', 'saving')),
  name text not null check (char_length(name) between 1 and 30),
  -- 변동지출 월 예산(원), 없으면 null
  monthly_budget bigint check (monthly_budget is null or monthly_budget >= 0),
  sort_order int not null default 0,
  archived boolean not null default false,
  unique (household_id, grp, name)
);

-- 결산월별 손익 금액
create table public.pnl_entries (
  settlement_id uuid not null references public.settlements (id) on delete cascade,
  item_id uuid not null references public.pnl_items (id) on delete cascade,
  amount bigint not null default 0 check (amount >= 0),
  primary key (settlement_id, item_id)
);

-- 결산월별 금융투자 섹터 금액
create table public.sector_amounts (
  settlement_id uuid not null references public.settlements (id) on delete cascade,
  sector text not null check (
    sector in ('시장지수', 'AI하드웨어', '첨단산업', 'AI소프트웨어', '채권', '암호화폐', '바이오/헬스', '기타')
  ),
  amount bigint not null default 0 check (amount >= 0),
  primary key (settlement_id, sector)
);

-- ───────── 권한 도우미 ─────────
-- 현재 로그인 사용자가 이 가구의 구성원인지 (RLS 재귀를 피하려고 security definer)
create function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$;

create function public.is_settlement_member(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.settlements s
    join public.household_members m on m.household_id = s.household_id
    where s.id = sid and m.user_id = auth.uid()
  );
$$;

-- ───────── RLS ─────────
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.accounts enable row level security;
alter table public.settlements enable row level security;
alter table public.account_balances enable row level security;
alter table public.pnl_items enable row level security;
alter table public.pnl_entries enable row level security;
alter table public.sector_amounts enable row level security;

-- 가구: 구성원만 조회·이름 변경. 생성·참여는 아래 함수로만.
create policy "members read household" on public.households
  for select to authenticated using (public.is_household_member(id));
create policy "members update household" on public.households
  for update to authenticated using (public.is_household_member(id)) with check (public.is_household_member(id));

-- 구성원 목록: 같은 가구 구성원끼리 조회, 자기 표시 이름 변경, 스스로 나가기
create policy "members read members" on public.household_members
  for select to authenticated using (public.is_household_member(household_id));
create policy "member updates self" on public.household_members
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "member leaves" on public.household_members
  for delete to authenticated using (user_id = auth.uid());

-- 가구 데이터: 구성원이면 모두 읽고 쓰기
create policy "members all accounts" on public.accounts
  for all to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members all settlements" on public.settlements
  for all to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members all pnl_items" on public.pnl_items
  for all to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members all balances" on public.account_balances
  for all to authenticated
  using (public.is_settlement_member(settlement_id)) with check (public.is_settlement_member(settlement_id));
create policy "members all pnl_entries" on public.pnl_entries
  for all to authenticated
  using (public.is_settlement_member(settlement_id)) with check (public.is_settlement_member(settlement_id));
create policy "members all sector_amounts" on public.sector_amounts
  for all to authenticated
  using (public.is_settlement_member(settlement_id)) with check (public.is_settlement_member(settlement_id));

-- 결산 수정 시각 갱신
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger settlements_touch before update on public.settlements
  for each row execute function public.touch_updated_at();

-- ───────── 가구 만들기 · 초대 코드로 참여 ─────────
-- 헷갈리는 글자(0/O, 1/I)를 뺀 8자리 코드
create function public.new_invite_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;
  return code;
end;
$$;

-- 새 가구를 만들고 만든 사람을 구성원으로 넣은 뒤, 디자인 기준 기본 손익 항목을 채운다
create function public.create_household(p_name text, p_role text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
begin
  if uid is null then
    raise exception '로그인이 필요합니다' using errcode = '28000';
  end if;
  if exists (select 1 from public.household_members where user_id = uid) then
    raise exception '이미 가구에 속해 있습니다' using errcode = 'P0001';
  end if;

  insert into public.households (name, invite_code, created_by)
  values (trim(p_name), public.new_invite_code(), uid)
  returning id into hid;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (hid, uid, p_role, trim(p_display_name));

  insert into public.pnl_items (household_id, grp, name, sort_order)
  select hid, v.grp, v.name, v.ord
  from (values
    ('income', '세후 근로소득', 1), ('income', '세후 배당/이자소득', 2),
    ('fixed', '대출 원금', 1), ('fixed', '대출 이자', 2), ('fixed', '차량임차료', 3), ('fixed', '통신비', 4),
    ('fixed', '아파트관리비', 5), ('fixed', '보험료', 6), ('fixed', '개인용돈', 7),
    ('variable', '교통', 1), ('variable', '식비', 2), ('variable', '쇼핑', 3), ('variable', '반려동물', 4),
    ('variable', '여행', 5), ('variable', '마트·편의점', 6), ('variable', '카페', 7), ('variable', '미용', 8),
    ('variable', '경조·선물', 9), ('variable', '의료·건강', 10), ('variable', '교육', 11), ('variable', '주거·통신', 12),
    ('variable', '생활', 13), ('variable', '취미·여가', 14), ('variable', '기타', 15),
    ('saving', '총 투자액', 1), ('saving', '총 저축액/부채상환액', 2)
  ) as v(grp, name, ord);

  return hid;
end;
$$;

-- 초대 코드로 배우자가 합류 (가구당 최대 2명, 역할 중복 불가)
create function public.join_household(p_code text, p_role text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
begin
  if uid is null then
    raise exception '로그인이 필요합니다' using errcode = '28000';
  end if;
  if exists (select 1 from public.household_members where user_id = uid) then
    raise exception '이미 가구에 속해 있습니다' using errcode = 'P0001';
  end if;

  select id into hid from public.households where invite_code = upper(trim(p_code));
  if hid is null then
    raise exception '초대 코드를 찾을 수 없습니다' using errcode = 'P0002';
  end if;
  if (select count(*) from public.household_members where household_id = hid) >= 2 then
    raise exception '이미 두 사람이 모두 참여한 가구입니다' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.household_members where household_id = hid and role = p_role) then
    raise exception '이 가구에는 이미 같은 역할의 구성원이 있습니다' using errcode = 'P0001';
  end if;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (hid, uid, p_role, trim(p_display_name));
  return hid;
end;
$$;

-- 함수 실행 권한: 로그인 사용자만
revoke execute on function public.create_household(text, text, text) from public, anon;
revoke execute on function public.join_household(text, text, text) from public, anon;
grant execute on function public.create_household(text, text, text) to authenticated;
grant execute on function public.join_household(text, text, text) to authenticated;
revoke execute on function public.new_invite_code() from public, anon, authenticated;

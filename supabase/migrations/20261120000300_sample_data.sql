-- 예시 데이터: 가구를 처음 만들 때 디자인 시안의 예시 값(자산·부채·12개월 결산·섹터·예산)을 채운다.
-- 예시로 넣은 행은 is_sample = true 로 표시해 두고, 'My 메뉴 → 예시 데이터 지우기'로 한 번에 지울 수 있다.

alter table public.households add column has_sample boolean not null default false;
alter table public.accounts add column is_sample boolean not null default false;
alter table public.settlements add column is_sample boolean not null default false;

-- ───────── 예시 데이터 채우기 (가구 만들기 함수에서만 호출) ─────────
create function private.seed_sample_data(hid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- 자산
  a_apt uuid; a_sec_h uuid; a_sec_w uuid; a_live uuid; a_emer uuid; a_irp uuid; a_etc uuid;
  -- 부채
  d_a uuid; d_b uuid; d_c uuid; d_d uuid; d_e uuid;
  k int; back int; m date; sid uuid;
  sec_h bigint; sec_w bigint; invest bigint;
begin
  insert into public.accounts (household_id, kind, name, category, owner, sort_order, is_sample) values (hid, 'asset', '멀캠 아파트', '부동산', 'joint', 1, true) returning id into a_apt;
  insert into public.accounts (household_id, kind, name, category, owner, sort_order, is_sample) values (hid, 'asset', '증권 계좌 · 남편', '금융투자', 'husband', 2, true) returning id into a_sec_h;
  insert into public.accounts (household_id, kind, name, category, owner, sort_order, is_sample) values (hid, 'asset', '증권 계좌 · 아내', '금융투자', 'wife', 3, true) returning id into a_sec_w;
  insert into public.accounts (household_id, kind, name, category, owner, sort_order, is_sample) values (hid, 'asset', '생활비 통장', '예적금', 'joint', 4, true) returning id into a_live;
  insert into public.accounts (household_id, kind, name, category, owner, sort_order, is_sample) values (hid, 'asset', '비상금 적금', '예적금', 'wife', 5, true) returning id into a_emer;
  insert into public.accounts (household_id, kind, name, category, owner, sort_order, is_sample) values (hid, 'asset', 'IRP', '연금', 'husband', 6, true) returning id into a_irp;
  insert into public.accounts (household_id, kind, name, category, owner, sort_order, is_sample) values (hid, 'asset', '기타 자산', '기타', 'joint', 7, true) returning id into a_etc;
  insert into public.accounts (household_id, kind, name, category, owner, interest_rate, sort_order, is_sample) values (hid, 'liability', 'A은행 주담대', '주택담보대출', 'joint', 3.90, 8, true) returning id into d_a;
  insert into public.accounts (household_id, kind, name, category, owner, interest_rate, sort_order, is_sample) values (hid, 'liability', 'B생명 주담대', '주택담보대출', 'joint', 4.20, 9, true) returning id into d_b;
  insert into public.accounts (household_id, kind, name, category, owner, interest_rate, sort_order, is_sample) values (hid, 'liability', 'C은행 주담대', '주택담보대출', 'joint', 4.10, 10, true) returning id into d_c;
  insert into public.accounts (household_id, kind, name, category, owner, interest_rate, sort_order, is_sample) values (hid, 'liability', 'D저축은행 주담대(법인)', '주택담보대출', 'joint', 4.60, 11, true) returning id into d_d;
  insert into public.accounts (household_id, kind, name, category, owner, interest_rate, sort_order, is_sample) values (hid, 'liability', 'E은행 신용대출', '신용대출', 'husband', 5.30, 12, true) returning id into d_e;

  -- 변동비 예산 (디자인: 식비 8만, 쇼핑 10만, 마트·편의점 10만, 카페 3만, 경조·선물 5만)
  update public.pnl_items i set monthly_budget = v.budget
  from (values ('식비', 80000), ('쇼핑', 100000), ('마트·편의점', 100000), ('카페', 30000), ('경조·선물', 50000)) as v(name, budget)
  where i.household_id = hid and i.grp = 'variable' and i.name = v.name;

  -- 2025-11 ~ 2026-10 (k = 0..11). 10월(k=11)은 진행 중, 나머지는 마감
  for k in 0..11 loop
    m := (date '2025-11-01' + make_interval(months => k))::date;
    insert into public.settlements (household_id, month, status, fx_rate, closed_at, is_sample)
    values (
      hid, m,
      case when k = 11 then 'in_progress' else 'closed' end,
      case k when 11 then 1380.50 when 10 then 1372.20 else round((1340 + k * 3.1)::numeric, 2) end,
      case when k = 11 then null else (m + interval '1 month' + interval '4 days') end,
      true
    )
    returning id into sid;

    if k = 11 then
      -- 10월: 디자인 재무상태표 값 그대로
      sec_h := 456789012; sec_w := 345678901;
      insert into public.account_balances (settlement_id, account_id, amount) values
        (sid, a_apt, 1234567890), (sid, a_sec_h, sec_h), (sid, a_sec_w, sec_w), (sid, a_live, 9876543),
        (sid, a_emer, 12345678), (sid, a_irp, 8765432), (sid, a_etc, 3456789),
        (sid, d_a, 345678901), (sid, d_b, 234567890), (sid, d_c, 123456789), (sid, d_d, 98765432), (sid, d_e, 23456789);
    else
      -- 9월(back=0)은 디자인의 '전월 대비'로 역산한 값, 그 이전 달은 9월에서 매달 조금씩 거슬러 올라간 값
      back := 10 - k;
      sec_h := 453332223 - back * 3000000;
      sec_w := 343333223 - back * 2000000;
      insert into public.account_balances (settlement_id, account_id, amount) values
        (sid, a_apt, 1234567890),
        (sid, a_sec_h, sec_h),
        (sid, a_sec_w, sec_w),
        (sid, a_live, 11111110 - (back % 3) * 400000),
        (sid, a_emer, 12222222 - back * 120000),
        (sid, a_irp, 8530865 - back * 230000),
        (sid, a_etc, 3456789),
        (sid, d_a, 346444333 + back * 765432),
        (sid, d_b, 235024679 + back * 456789),
        (sid, d_c, 124111110 + back * 654321),
        (sid, d_d, 99111110 + back * 345678),
        (sid, d_e, 23456789);
    end if;

    -- 손익: 10월은 디자인의 '이번 달', 그 이전은 '지난달' 값
    insert into public.pnl_entries (settlement_id, item_id, amount)
    select sid, i.id, v.amount
    from (
      select * from (values
        ('income', '세후 근로소득', 9876543, 9876543),
        ('income', '세후 배당/이자소득', 654321, 543210),
        ('fixed', '대출 원금', 2345678, 2345678),
        ('fixed', '대출 이자', 1234567, 1245678),
        ('fixed', '차량임차료', 1123456, 1123456),
        ('fixed', '통신비', 123456, 123456),
        ('fixed', '아파트관리비', 345678, 321098),
        ('fixed', '보험료', 234567, 234567),
        ('fixed', '개인용돈', 1234567, 1234567),
        ('variable', '식비', 0, 23456),
        ('variable', '쇼핑', 0, 56789),
        ('variable', '마트·편의점', 65432, 76543),
        ('variable', '카페', 12345, 23456),
        ('variable', '경조·선물', 0, 45678),
        ('variable', '생활', 34567, 32109),
        ('variable', '기타', 23456, 12345),
        ('saving', '총 투자액', 3456789, 3456789)
      ) as t(grp, name, oct, prev)
    ) as src
    cross join lateral (select case when k = 11 then src.oct else src.prev end as amount) as v
    join public.pnl_items i on i.household_id = hid and i.grp = src.grp and i.name = src.name
    where v.amount > 0;

    -- 섹터: 금융투자 총액을 디자인 비중(36·28·14·11·5·3·2·1%)으로 나눔. 10월은 디자인 금액 그대로
    invest := sec_h + sec_w;
    if k = 11 then
      insert into public.sector_amounts (settlement_id, sector, amount) values
        (sid, '시장지수', 288888449), (sid, 'AI하드웨어', 224691016), (sid, '첨단산업', 112345508), (sid, 'AI소프트웨어', 88271470),
        (sid, '채권', 40123396), (sid, '암호화폐', 24074037), (sid, '바이오/헬스', 16049358), (sid, '기타', 8024679);
    else
      insert into public.sector_amounts (settlement_id, sector, amount)
      select sid, s.sector,
        case when s.sector = '기타'
          -- 나머지는 '기타'에 몰아 합계가 금융투자 총액과 정확히 같게
          then invest - (round(invest * 0.36) + round(invest * 0.28) + round(invest * 0.14) + round(invest * 0.11) + round(invest * 0.05) + round(invest * 0.03) + round(invest * 0.02))::bigint
          else round(invest * s.share)::bigint end
      from (values ('시장지수', 0.36), ('AI하드웨어', 0.28), ('첨단산업', 0.14), ('AI소프트웨어', 0.11), ('채권', 0.05), ('암호화폐', 0.03), ('바이오/헬스', 0.02), ('기타', 0.01)) as s(sector, share);
    end if;
  end loop;

  update public.households set has_sample = true where id = hid;
end;
$$;

revoke execute on function private.seed_sample_data(uuid) from public, anon, authenticated;

-- ───────── 가구 만들기: 예시 데이터 옵션 추가 (기본 켜짐) ─────────
drop function public.create_household(text, text, text);

create function public.create_household(p_name text, p_role text, p_display_name text, p_with_sample boolean default true)
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

  if p_with_sample then
    perform private.seed_sample_data(hid);
  end if;

  return hid;
end;
$$;

revoke execute on function public.create_household(text, text, text, boolean) from public, anon;
grant execute on function public.create_household(text, text, text, boolean) to authenticated;

-- ───────── 예시 데이터 지우기 (내 가구의 예시 행만) ─────────
create function public.clear_sample_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid;
begin
  select household_id into hid from public.household_members where user_id = auth.uid();
  if hid is null then
    raise exception '가구에 속해 있지 않습니다' using errcode = 'P0002';
  end if;
  -- 예시 결산월(잔액·손익·섹터는 cascade로 함께) → 예시 자산·부채 → 예산 초기화
  delete from public.settlements where household_id = hid and is_sample;
  delete from public.accounts where household_id = hid and is_sample;
  update public.pnl_items set monthly_budget = null where household_id = hid;
  update public.households set has_sample = false where id = hid;
end;
$$;

revoke execute on function public.clear_sample_data() from public, anon;
grant execute on function public.clear_sample_data() to authenticated;

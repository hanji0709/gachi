-- 보안·성능 점검(advisors) 반영

-- 1) RLS 도우미 함수를 API에 노출되지 않는 private 스키마로 이동
--    (public에 있으면 /rest/v1/rpc 로 누구나 호출할 수 있음). 정책은 함수 OID로 참조하므로 그대로 동작.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.is_household_member(uuid) set schema private;
alter function public.is_settlement_member(uuid) set schema private;

revoke execute on function private.is_household_member(uuid) from public, anon;
revoke execute on function private.is_settlement_member(uuid) from public, anon;
grant execute on function private.is_household_member(uuid) to authenticated;
grant execute on function private.is_settlement_member(uuid) to authenticated;

-- 2) auth.uid()를 행마다 다시 계산하지 않도록 (select auth.uid())
alter policy "member updates self" on public.household_members
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "member leaves" on public.household_members
  using (user_id = (select auth.uid()));

-- 3) 외래 키 인덱스
create index if not exists account_balances_account_idx on public.account_balances (account_id);
create index if not exists households_created_by_idx on public.households (created_by);
create index if not exists pnl_entries_item_idx on public.pnl_entries (item_id);

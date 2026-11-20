-- 배우자가 입력한 값이 실시간으로 보이도록 Realtime(postgres_changes)에 결산 관련 테이블을 추가.
-- Realtime도 RLS를 따르므로 같은 가구 구성원에게만 변경이 전달된다.
alter publication supabase_realtime add table
  public.settlements,
  public.accounts,
  public.pnl_items,
  public.account_balances,
  public.pnl_entries,
  public.sector_amounts;

-- 경제적 자유 목표 (가구마다 수정 가능)
-- fire_target_asset: 지표 A 목표 자산 · fire_living_cost: 지표 B 부부 생활비 예산(월)
alter table public.households
  add column fire_target_asset bigint not null default 1200000000 check (fire_target_asset > 0),
  add column fire_living_cost bigint not null default 2400000 check (fire_living_cost > 0);

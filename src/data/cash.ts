import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { supabase, toKoreanError } from '../lib/supabase'
import { computeSheet } from './compute'
import { addMonths, monthToDate, splitMonth } from './format'
import type { AccountOwner } from './ledger'
import { useHouseholdRealtime } from './realtime'
import type { BalanceSheetModel } from './useBalanceSheet'

/* ───────── 타입 ───────── */
export type CashKind = 'income' | 'living' | 'loan' | 'saving'
export const CASH_KIND_LABEL: Record<CashKind, string> = { income: '수입', living: '생활비', loan: '대출 상환', saving: '저축/투자' }
export const CASH_KIND_COLOR: Record<CashKind, string> = {
  income: 'var(--good)',
  living: 'var(--violet-300)',
  loan: 'var(--violet-700)',
  saving: 'var(--cyan-500)',
}
export const CASH_KINDS: CashKind[] = ['income', 'living', 'loan', 'saving']

/** 안전 잔액: 통장에 늘 남겨 둘 금액 */
export const SAFETY_BALANCE = 3_000_000
/** 잉여 현금 배분 항목 */
export const PLAN_KEYS = ['비상금', '저축', '투자', '추가 상환'] as const
export type PlanKey = (typeof PLAN_KEYS)[number]

export interface CashItem {
  id: string
  name: string
  day: number
  amount: number
  kind: CashKind
  sortOrder: number
}

interface CashMonth {
  startBalance: number | null
  plan: Partial<Record<PlanKey, number>> | null
}

type Row = Record<string, unknown>
const toItem = (r: Row): CashItem => ({
  id: r.id as string,
  name: r.name as string,
  day: Number(r.day),
  amount: Number(r.amount),
  kind: r.kind as CashKind,
  sortOrder: Number(r.sort_order),
})
function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error
  return res.data
}

/* ───────── 계산: 날짜 순으로 쌓아 잔액 예상 ───────── */
export interface CashEvent {
  item: CashItem
  /** 그 달 실제 날짜 (말일 보정) */
  day: number
  /** 수입 +, 나머지 − */
  delta: number
  balance: number
}

export interface Projection {
  lastDay: number
  start: number
  events: CashEvent[]
  end: number
  min: number
  minDay: number | null
  inflow: number
  outflow: number
  outByKind: Record<Exclude<CashKind, 'income'>, number>
  /** 쓸 수 있는 잉여 = 월말 예상 − 안전 잔액 */
  surplus: number
}

export function project(items: CashItem[], month: string, start: number): Projection {
  const { year, month: m } = splitMonth(month)
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate()
  const sorted = [...items].sort((a, b) => Math.min(a.day, lastDay) - Math.min(b.day, lastDay) || (a.kind === 'income' ? 1 : 0) - (b.kind === 'income' ? 1 : 0) || a.sortOrder - b.sortOrder)
  let bal = start
  let min = start
  let minDay: number | null = null
  const outByKind = { living: 0, loan: 0, saving: 0 }
  let inflow = 0
  const events = sorted.map((item) => {
    const delta = item.kind === 'income' ? item.amount : -item.amount
    bal += delta
    if (item.kind === 'income') inflow += item.amount
    else outByKind[item.kind] += item.amount
    const day = Math.min(item.day, lastDay)
    if (bal < min) {
      min = bal
      minDay = day
    }
    return { item, day, delta, balance: bal }
  })
  const outflow = outByKind.living + outByKind.loan + outByKind.saving
  return { lastDay, start, events, end: bal, min, minDay, inflow, outflow, outByKind, surplus: bal - SAFETY_BALANCE }
}

const ALL = new Set<AccountOwner>(['joint', 'husband', 'wife'])

/* ───────── 화면 데이터 + 저장 ───────── */
export function useCashFlow(month: string, sheet: BalanceSheetModel) {
  const { household } = useAuth()
  const householdId = household?.id ?? ''
  const [items, setItems] = useState<CashItem[] | null>(null)
  const [monthRow, setMonthRow] = useState<CashMonth | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!householdId) return
    try {
      const [its, mo] = await Promise.all([
        supabase.from('cash_items').select('id, name, day, amount, kind, sort_order').eq('household_id', householdId).order('day').order('sort_order'),
        supabase.from('cash_months').select('start_balance, plan').eq('household_id', householdId).eq('month', monthToDate(month)).maybeSingle(),
      ])
      setItems((check(its) ?? []).map(toItem))
      const r = check(mo) as Row | null
      setMonthRow(r ? { startBalance: r.start_balance === null ? null : Number(r.start_balance), plan: (r.plan as CashMonth['plan']) ?? null } : null)
      setError(null)
    } catch (e) {
      setError(toKoreanError(e))
    }
  }, [householdId, month])

  useEffect(() => {
    void load()
  }, [load])
  const loadRef = useRef(load)
  loadRef.current = load
  const timer = useRef<number>()
  const reloadSoon = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void loadRef.current(), 400)
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  useHouseholdRealtime(reloadSoon)

  // 기본 시작 잔액: 직전 달(없으면 그 전 가장 가까운 달) 결산의 예적금 합계
  const prevSettlement = [...sheet.settlements].reverse().find((s) => s.month <= addMonths(month, -1)) ?? null
  const defaultStart = prevSettlement ? computeSheet(sheet.accounts, sheet.valuesOf(prevSettlement.month).balances, { owners: ALL }).liquid : 0
  const start = monthRow?.startBalance ?? defaultStart

  const run = async (task: () => Promise<unknown>) => {
    try {
      await task()
      setError(null)
    } catch (e) {
      setError(toKoreanError(e))
    }
    await load()
  }

  const upsertMonth = (patch: Partial<{ start_balance: number | null; plan: CashMonth['plan'] }>) =>
    run(async () =>
      check(
        await supabase.from('cash_months').upsert({
          household_id: householdId,
          month: monthToDate(month),
          start_balance: monthRow?.startBalance ?? null,
          plan: monthRow?.plan ?? null,
          ...patch,
          updated_at: new Date().toISOString(),
        }),
      ),
    )

  return {
    loading: items === null && !error,
    error,
    items: items ?? [],
    start,
    startIsDefault: monthRow?.startBalance == null,
    startBasis: prevSettlement ? `${splitMonth(prevSettlement.month).month}월 결산 예적금 합계 기준` : '결산 예적금 없음',
    plan: monthRow?.plan ?? {},
    projection: project(items ?? [], month, start),
    setStart: (n: number | null) => upsertMonth({ start_balance: n }),
    savePlan: (plan: Partial<Record<PlanKey, number>>) => upsertMonth({ plan }),
    addItem: (it: Omit<CashItem, 'id' | 'sortOrder'>) =>
      run(async () =>
        check(
          await supabase.from('cash_items').insert({ household_id: householdId, name: it.name.trim(), day: it.day, amount: it.amount, kind: it.kind, sort_order: (items?.length ?? 0) + 1 }),
        ),
      ),
    updateItem: (id: string, patch: Partial<Pick<CashItem, 'name' | 'day' | 'amount' | 'kind'>>) => {
      setItems((list) => list && list.map((i) => (i.id === id ? { ...i, ...patch } : i)))
      return run(async () => check(await supabase.from('cash_items').update(patch).eq('id', id)))
    },
    removeItem: (id: string) => {
      setItems((list) => list && list.filter((i) => i.id !== id))
      return run(async () => check(await supabase.from('cash_items').delete().eq('id', id)))
    },
  }
}

export type CashModel = ReturnType<typeof useCashFlow>

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { toKoreanError } from '../lib/supabase'
import { addMonths } from './format'
import { useHouseholdRealtime } from './realtime'
import {
  emptyValues,
  fetchAccounts,
  fetchPnlItems,
  fetchSettlements,
  fetchValues,
  type Account,
  type MonthValues,
  type PnlItem,
  type Settlement,
} from './ledger'

interface Loaded {
  accounts: Account[]
  items: PnlItem[]
  /** 잔액이 하나라도 입력된 결산월만, 오래된 순 */
  settlements: Settlement[]
  /** 손익이 하나라도 입력된 결산월, 오래된 순 */
  pnlSettlements: Settlement[]
  values: Map<string, MonthValues>
}

/**
 * 재무상태표용 데이터: 모든 결산월의 잔액(추이·전월 대비) + 자산·부채 목록(숨긴 것 포함).
 * 배우자가 결산을 바꾸면 Realtime으로 다시 불러옴.
 */
export function useBalanceSheet() {
  const { household } = useAuth()
  const householdId = household?.id ?? ''
  const [data, setData] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!householdId) return
    try {
      const [accounts, items, all] = await Promise.all([
        fetchAccounts(householdId, { includeArchived: true }),
        fetchPnlItems(householdId),
        fetchSettlements(householdId),
      ])
      const values = await fetchValues(all.map((s) => s.id))
      const settlements = all.filter((s) => (values.get(s.id)?.balances.size ?? 0) > 0)
      const pnlSettlements = all.filter((s) => (values.get(s.id)?.entries.size ?? 0) > 0)
      setData({ accounts, items, settlements, pnlSettlements, values })
      setError(null)
    } catch (e) {
      setError(toKoreanError(e))
    }
  }, [householdId])

  useEffect(() => {
    void load()
  }, [load])

  // 배우자 변경 반영: 가구 공용 Realtime 채널에 리스너만 등록 (변경을 모아 0.5초 뒤 한 번 다시 불러옴)
  const loadRef = useRef(load)
  loadRef.current = load
  const timer = useRef<number>()
  const reloadSoon = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void loadRef.current(), 500)
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  useHouseholdRealtime(reloadSoon)

  /** 기본 기준월: 잔액이 입력된 가장 최근 달 (마감 전이면 화면에 "입력 기준"으로 표시) */
  const defaultMonth = data?.settlements[data.settlements.length - 1]?.month ?? null

  const valuesOf = (month: string | null): MonthValues => {
    const s = data?.settlements.find((x) => x.month === month)
    return (s && data?.values.get(s.id)) || emptyValues()
  }
  const settlementOf = (month: string | null) => data?.settlements.find((x) => x.month === month) ?? null
  /** 손익용: 잔액 입력 여부와 관계없이 그 달 값 */
  const pnlValuesOf = (month: string): MonthValues => {
    const s = data?.pnlSettlements.find((x) => x.month === month)
    return (s && data?.values.get(s.id)) || emptyValues()
  }

  return {
    loading: !data && !error,
    error,
    reload: load,
    accounts: data?.accounts ?? [],
    items: data?.items ?? [],
    settlements: data?.settlements ?? [],
    pnlSettlements: data?.pnlSettlements ?? [],
    pnlValuesOf,
    defaultMonth,
    valuesOf,
    settlementOf,
    prevMonthOf: (m: string) => addMonths(m, -1),
  }
}

export type BalanceSheetModel = ReturnType<typeof useBalanceSheet>

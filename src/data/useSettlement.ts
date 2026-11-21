import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { toKoreanError } from '../lib/supabase'
import { addMonths } from './format'
import { useHouseholdRealtime } from './realtime'
import {
  archiveAccount,
  createAccount,
  emptyValues,
  ensureSettlement,
  fetchAccounts,
  fetchPnlItems,
  fetchSettlements,
  fetchValues,
  updateBudget,
  updateSettlement,
  upsertBalances,
  upsertEntries,
  upsertSectors,
  type Account,
  type MonthValues,
  type NewAccount,
  type PnlItem,
  type Sector,
  type Settlement,
} from './ledger'

export type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; at: number } | { kind: 'error'; message: string }

interface Loaded {
  accounts: Account[]
  items: PnlItem[]
  settlements: Settlement[]
  cur: MonthValues
  prev: MonthValues
}

/**
 * 월별 결산 한 달 치 데이터 + 저장 동작.
 * - 입력 즉시 화면 반영(낙관적) → Supabase에 저장
 * - 배우자가 바꾸면 Realtime으로 다시 불러옴
 */
export function useSettlement(month: string) {
  const { household, me } = useAuth()
  const householdId = household?.id ?? ''
  const [data, setData] = useState<Loaded | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [save, setSave] = useState<SaveState>({ kind: 'idle' })
  /** 진행 중인 저장 수 */
  const pending = useRef(0)
  /** 내가 값을 바꿀 때마다 1씩 증가 — 불러오는 사이에 바뀌었으면 그 불러오기 결과는 버림 */
  const writeSeq = useRef(0)

  const prevMonth = addMonths(month, -1)

  const load = useCallback(async () => {
    if (!householdId) return
    const seqAtStart = writeSeq.current
    try {
      const [accounts, items, settlements] = await Promise.all([
        fetchAccounts(householdId),
        fetchPnlItems(householdId),
        fetchSettlements(householdId),
      ])
      const cur = settlements.find((s) => s.month === month)
      const prev = settlements.find((s) => s.month === prevMonth)
      const values = await fetchValues([cur?.id, prev?.id].filter(Boolean) as string[])
      // 불러오는 동안 내가 입력했다면 이 결과는 입력 전 상태라 화면을 덮으면 안 됨 → 저장 후 다시 불러옴
      if (writeSeq.current !== seqAtStart || pending.current > 0) {
        reloadSoonRef.current()
        return
      }
      setData({
        accounts,
        items,
        settlements,
        cur: (cur && values.get(cur.id)) || emptyValues(),
        prev: (prev && values.get(prev.id)) || emptyValues(),
      })
      setLoadError(null)
    } catch (e) {
      setLoadError(toKoreanError(e))
    }
  }, [householdId, month, prevMonth])

  useEffect(() => {
    setData(null)
    void load()
  }, [load])

  // 배우자 변경 반영: 여러 이벤트를 모아 한 번만 다시 불러옴.
  // 최신 load를 ref로 들고 있어서 리스너 함수는 바뀌지 않음(월이 바뀌어도 재구독 없음)
  const loadRef = useRef(load)
  loadRef.current = load
  const reloadTimer = useRef<number>()
  const reloadSoon = useCallback(() => {
    window.clearTimeout(reloadTimer.current)
    reloadTimer.current = window.setTimeout(() => {
      // 내가 저장 중이면 저장이 끝난 뒤 반영
      if (pending.current === 0) void loadRef.current()
      else reloadSoon()
    }, 400)
  }, [])
  const reloadSoonRef = useRef(reloadSoon)
  useEffect(() => () => window.clearTimeout(reloadTimer.current), [])

  // Realtime: 가구 공용 채널에 리스너만 등록
  useHouseholdRealtime(reloadSoon)

  /** 저장 실행 + 상태 표시 */
  const run = useCallback(async (task: () => Promise<void>) => {
    writeSeq.current += 1
    pending.current += 1
    setSave({ kind: 'saving' })
    let failed = false
    try {
      await task()
      setSave({ kind: 'saved', at: Date.now() })
    } catch (e) {
      failed = true
      setSave({ kind: 'error', message: toKoreanError(e) })
    } finally {
      pending.current -= 1
    }
    if (failed) reloadSoonRef.current() // 실패하면 서버 값으로 되돌림
  }, [])

  const settlement = data?.settlements.find((s) => s.month === month) ?? null
  const prevSettlement = data?.settlements.find((s) => s.month === prevMonth) ?? null
  const locked = settlement?.status === 'closed'

  /** 이번 달 결산 행 (없으면 만들고 목록에 반영) */
  const settlementId = useCallback(async (): Promise<string> => {
    if (settlement) return settlement.id
    const s = await ensureSettlement(householdId, month)
    setData((d) => (d && !d.settlements.some((x) => x.id === s.id) ? { ...d, settlements: [...d.settlements, s] } : d))
    return s.id
  }, [settlement, householdId, month])

  const patchCur = (fn: (v: MonthValues) => void) =>
    setData((d) => {
      if (!d) return d
      const cur: MonthValues = { balances: new Map(d.cur.balances), entries: new Map(d.cur.entries), sectors: new Map(d.cur.sectors) }
      fn(cur)
      return { ...d, cur }
    })

  const setBalance = (accountId: string, amount: number) => {
    patchCur((v) => v.balances.set(accountId, amount))
    return run(async () => upsertBalances(await settlementId(), [{ accountId, amount }]))
  }
  const setEntry = (itemId: string, amount: number) => {
    patchCur((v) => v.entries.set(itemId, amount))
    return run(async () => upsertEntries(await settlementId(), [{ itemId, amount }]))
  }
  const setSector = (sector: Sector, amount: number) => {
    patchCur((v) => v.sectors.set(sector, amount))
    return run(async () => upsertSectors(await settlementId(), [{ sector, amount }]))
  }
  const setFx = (rate: number | null) =>
    run(async () => {
      const id = await settlementId()
      setData((d) => d && { ...d, settlements: d.settlements.map((s) => (s.id === id ? { ...s, fxRate: rate } : s)) })
      await updateSettlement(id, { fx_rate: rate })
    })

  const addAccount = (a: NewAccount) =>
    run(async () => {
      const created = await createAccount(householdId, a, (data?.accounts.length ?? 0) + 1)
      setData((d) => d && { ...d, accounts: [...d.accounts, created] })
    })
  const removeAccount = (accountId: string) =>
    run(async () => {
      setData((d) => d && { ...d, accounts: d.accounts.filter((a) => a.id !== accountId) })
      await archiveAccount(accountId)
    })
  const setBudget = (itemId: string, budget: number | null) =>
    run(async () => {
      setData((d) => d && { ...d, items: d.items.map((i) => (i.id === itemId ? { ...i, monthlyBudget: budget } : i)) })
      await updateBudget(itemId, budget)
    })

  /** 내 확인 / 확인 취소 */
  const toggleConfirm = () =>
    run(async () => {
      if (!me) return
      const id = await settlementId()
      const field = me.role === 'husband' ? 'husband_confirmed_at' : 'wife_confirmed_at'
      const mine = me.role === 'husband' ? settlement?.husbandConfirmedAt : settlement?.wifeConfirmedAt
      const value = mine ? null : new Date().toISOString()
      setData(
        (d) =>
          d && {
            ...d,
            settlements: d.settlements.map((s) =>
              s.id === id ? { ...s, [me.role === 'husband' ? 'husbandConfirmedAt' : 'wifeConfirmedAt']: value } : s,
            ),
          },
      )
      await updateSettlement(id, { [field]: value })
    })
  const close = () =>
    run(async () => {
      const id = await settlementId()
      const now = new Date().toISOString()
      setData((d) => d && { ...d, settlements: d.settlements.map((s) => (s.id === id ? { ...s, status: 'closed', closedAt: now } : s)) })
      await updateSettlement(id, { status: 'closed', closed_at: now })
    })
  /** 마감 해제: 두 사람 확인도 초기화 */
  const reopen = () =>
    run(async () => {
      if (!settlement) return
      setData(
        (d) =>
          d && {
            ...d,
            settlements: d.settlements.map((s) =>
              s.id === settlement.id ? { ...s, status: 'in_progress', closedAt: null, husbandConfirmedAt: null, wifeConfirmedAt: null } : s,
            ),
          },
      )
      await updateSettlement(settlement.id, { status: 'in_progress', closed_at: null, husband_confirmed_at: null, wife_confirmed_at: null })
    })

  const statusByMonth = useMemo(() => new Map((data?.settlements ?? []).map((s) => [s.month, s.status])), [data?.settlements])

  return {
    loading: !data && !loadError,
    loadError,
    reload: load,
    accounts: data?.accounts ?? [],
    items: data?.items ?? [],
    cur: data?.cur ?? emptyValues(),
    prev: data?.prev ?? emptyValues(),
    settlement,
    prevSettlement,
    statusByMonth,
    locked,
    save,
    setBalance,
    setEntry,
    setSector,
    setFx,
    addAccount,
    removeAccount,
    setBudget,
    toggleConfirm,
    close,
    reopen,
  }
}

export type SettlementModel = ReturnType<typeof useSettlement>

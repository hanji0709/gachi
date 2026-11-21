import { useMemo, useState } from 'react'
import { summarizePnl, type PnlSummary } from '../../data/compute'
import { addMonths, splitMonth } from '../../data/format'
import type { PnlGroup, PnlItem } from '../../data/ledger'
import type { BalanceSheetModel } from '../../data/useBalanceSheet'

export type PeriodUnit = '월' | '분기' | '연' | '사용자 지정'
export const PERIOD_UNITS: PeriodUnit[] = ['월', '분기', '연', '사용자 지정']

/** from ~ to (포함) 사이의 결산월 목록 */
function monthsBetween(from: string, to: string): string[] {
  const out: string[] = []
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m)
  return out
}

/** 기준월이 속한 기간 */
function rangeOf(unit: Exclude<PeriodUnit, '사용자 지정'>, anchor: string): [string, string] {
  const { year, month } = splitMonth(anchor)
  if (unit === '월') return [anchor, anchor]
  if (unit === '연') return [`${year}-01`, `${year}-12`]
  const qStart = Math.floor((month - 1) / 3) * 3 + 1
  const from = `${year}-${String(qStart).padStart(2, '0')}`
  return [from, addMonths(from, 2)]
}

export interface ItemTotal {
  item: PnlItem
  amount: number
}

/** 기간 손익 합계 */
export interface PeriodTotals {
  summary: PnlSummary
  byGroup: Record<PnlGroup, ItemTotal[]>
  /** 결산이 입력된 달 수 */
  monthCount: number
}

function totalsOf(model: BalanceSheetModel, months: string[]): PeriodTotals {
  const sums = new Map<string, number>()
  let monthCount = 0
  for (const m of months) {
    const v = model.pnlValuesOf(m)
    if (v.entries.size > 0) monthCount += 1
    for (const [id, n] of v.entries) sums.set(id, (sums.get(id) ?? 0) + n)
  }
  const byGroup = { income: [], fixed: [], variable: [], saving: [] } as Record<PnlGroup, ItemTotal[]>
  for (const item of model.items) byGroup[item.grp].push({ item, amount: sums.get(item.id) ?? 0 })
  for (const g of Object.keys(byGroup) as PnlGroup[]) byGroup[g].sort((a, b) => b.amount - a.amount)
  return { summary: summarizePnl(model.items, sums), byGroup, monthCount }
}

/* ───────── 추이 차트: 기간 단위대로 묶음 ─────────
 * 월 → 최근 12개월 · 분기 → 최근 8개 분기 · 연 → 전체 연도 · 사용자 지정 → 범위 안 월별
 * (선택한 기간까지, 결산이 입력된 기간만) */
export interface TrendBucket {
  key: string
  /** 축 글자 */
  label: string
  /** 팝업 제목 */
  title: string
  income: number
  expense: number
  net: number
  /** 지금 선택한 기간 */
  current: boolean
}

function trendOf(model: BalanceSheetModel, unit: PeriodUnit, range: [string, string]): TrendBucket[] {
  const months = model.pnlSettlements.map((s) => s.month).filter((m) => m <= range[1])
  const bucketOf = (m: string) => {
    const { year, month } = splitMonth(m)
    if (unit === '분기') {
      const q = Math.floor((month - 1) / 3) + 1
      return { key: `${year}-Q${q}`, label: `${String(year).slice(2)}년 ${q}분기`, title: `${year}년 ${q}분기` }
    }
    if (unit === '연') return { key: String(year), label: `${year}`, title: `${year}년` }
    return { key: m, label: `${month}월`, title: `${year}년 ${month}월` }
  }
  const scope = unit === '사용자 지정' ? months.filter((m) => m >= range[0]) : months
  const buckets = new Map<string, TrendBucket & { entries: Map<string, number> }>()
  for (const m of scope) {
    const b = bucketOf(m)
    const cur = buckets.get(b.key) ?? { ...b, income: 0, expense: 0, net: 0, current: false, entries: new Map<string, number>() }
    for (const [id, n] of model.pnlValuesOf(m).entries) cur.entries.set(id, (cur.entries.get(id) ?? 0) + n)
    buckets.set(b.key, cur)
  }
  const currentKey = bucketOf(range[1]).key
  const list = [...buckets.values()].map(({ entries, ...b }) => {
    const s = summarizePnl(model.items, entries)
    return { ...b, income: s.income, expense: s.expense, net: s.net, current: unit === '사용자 지정' ? false : b.key === currentKey }
  })
  const keep = unit === '월' ? 12 : unit === '분기' ? 8 : list.length
  return list.slice(-keep)
}

/** 기간별 손익 분석 화면 상태 (기간 단위 · 이동 · 사용자 지정 범위) + 계산 */
export function usePnlView(model: BalanceSheetModel) {
  const available = model.pnlSettlements.map((s) => s.month)
  const first = available[0] ?? null
  const last = available[available.length - 1] ?? null

  const [unit, setUnitState] = useState<PeriodUnit>('분기')
  const [anchor, setAnchor] = useState<string | null>(null)
  const [custom, setCustom] = useState<[string, string] | null>(null)

  const base = anchor ?? last
  const customRange: [string, string] | null = custom ?? (last ? [addMonths(last, -5) < (first ?? last) ? (first ?? last) : addMonths(last, -5), last] : null)
  const range: [string, string] | null = !base ? null : unit === '사용자 지정' ? customRange : rangeOf(unit, base)

  const setUnit = (u: PeriodUnit) => {
    setUnitState(u)
    // 사용자 지정으로 바꾸면 지금 보던 기간에서 시작
    if (u === '사용자 지정' && range && !custom) setCustom(range)
  }
  const setFrom = (m: string) => customRange && setCustom([m, m > customRange[1] ? m : customRange[1]])
  const setTo = (m: string) => customRange && setCustom([m < customRange[0] ? m : customRange[0], m])

  const length = range ? monthsBetween(range[0], range[1]).length : 0
  /** 앞뒤 기간으로 이동 (사용자 지정은 같은 길이만큼) */
  const shift = (dir: -1 | 1) => {
    if (!range) return
    if (unit === '사용자 지정') setCustom([addMonths(range[0], dir * length), addMonths(range[1], dir * length)])
    else setAnchor(addMonths(unit === '월' ? range[0] : dir > 0 ? range[1] : range[0], dir))
  }
  const canPrev = Boolean(range && first && range[0] > first)
  const canNext = Boolean(range && last && range[1] < last)

  const view = useMemo(() => {
    if (!range) return null
    const months = monthsBetween(range[0], range[1])
    const cur = totalsOf(model, months)
    const prevMonths = monthsBetween(addMonths(range[0], -months.length), addMonths(range[0], -1))
    const prev = totalsOf(model, prevMonths)
    return { months, cur, prev: prev.monthCount > 0 ? prev : null, trend: trendOf(model, unit, range) }
  }, [model, unit, range?.[0], range?.[1]]) // eslint-disable-line react-hooks/exhaustive-deps

  const label = range ? (range[0] === range[1] ? range[0] : `${range[0]} ~ ${range[1]}`) : ''

  const trendTitle = unit === '분기' ? '분기별 수입·지출 추이' : unit === '연' ? '연도별 수입·지출 추이' : '월별 수입·지출 추이'
  return { unit, setUnit, range, label, shift, canPrev, canNext, available, setFrom, setTo, view, trendTitle }
}

export type PnlView = ReturnType<typeof usePnlView>

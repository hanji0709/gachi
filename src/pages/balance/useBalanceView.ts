import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Owner, Tone } from '../../components/ui'
import { computeSheet, sectorList, sectorTotal, summarizePnl, type BalanceSheet } from '../../data/compute'
import { addMonths, formatDelta, formatShort, formatUsd, formatWon, monthEndLabel } from '../../data/format'
import { OWNER_LABEL, type Account, type AccountOwner } from '../../data/ledger'
import type { BalanceSheetModel } from '../../data/useBalanceSheet'

export const ASSET_COLORS: Record<string, string> = {
  부동산: 'var(--chart-1)',
  금융투자: 'var(--chart-2)',
  예적금: 'var(--chart-3)',
  연금: 'var(--chart-4)',
  기타: 'var(--chart-5)',
}
export const DEBT_COLORS: Record<string, string> = {
  주택담보대출: 'var(--violet-900)',
  전세보증금: 'var(--violet-300)',
  신용대출: 'var(--cyan-500)',
  기타대출: 'var(--text-disabled)',
}
export const SECTOR_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)', 'var(--chart-8)']

export type Currency = 'krw' | 'usd'
export type Period = '1년' | '3년' | '전체'

const OWNER_KEY: Record<Owner, AccountOwner> = { 공동: 'joint', 남편: 'husband', 아내: 'wife' }
const ALL_OWNERS: Owner[] = ['공동', '남편', '아내']

export interface AccountRow {
  account: Account
  amount: number
  delta: number | null
}

/** 재무상태표 화면 상태(기준월·소유자·통화·전세금·기간) + 표시용 계산 */
export function useBalanceView(model: BalanceSheetModel) {
  const [params, setParams] = useSearchParams()
  const [owners, setOwners] = useState<Owner[]>(ALL_OWNERS)
  const [currency, setCurrency] = useState<Currency>('krw')
  const [excludeJeonse, setExcludeJeonse] = useState(false)
  const [period, setPeriod] = useState<Period>('1년')

  const requested = params.get('m')
  const month = requested && model.settlements.some((s) => s.month === requested) ? requested : model.defaultMonth
  const setMonth = (m: string) =>
    setParams(
      (p) => {
        p.set('m', m)
        return p
      },
      { replace: true },
    )

  const settlement = model.settlementOf(month)
  const prevMonth = month ? addMonths(month, -1) : null
  const prevSettlement = model.settlementOf(prevMonth)
  const fx = settlement?.fxRate ?? null
  const usd = currency === 'usd' && fx !== null

  const view = useMemo(() => {
    const opt = { owners: new Set(owners.map((o) => OWNER_KEY[o])), excludeJeonse }
    const cur = model.valuesOf(month)
    const prev = prevSettlement ? model.valuesOf(prevMonth) : null
    const sheet = computeSheet(model.accounts, cur.balances, opt)
    const prevSheet: BalanceSheet | null = prev ? computeSheet(model.accounts, prev.balances, opt) : null

    const rows = (kind: 'asset' | 'liability'): AccountRow[] =>
      model.accounts
        .filter((a) => a.kind === kind && opt.owners.has(a.owner) && (cur.balances.has(a.id) || !a.archived))
        .filter((a) => !(kind === 'liability' && excludeJeonse && a.category === '전세보증금'))
        .map((a) => ({
          account: a,
          amount: cur.balances.get(a.id) ?? 0,
          delta: prev ? (cur.balances.get(a.id) ?? 0) - (prev.balances.get(a.id) ?? 0) : null,
        }))
        .sort((x, y) => y.amount - x.amount)

    // 순자산 추이 (기준월까지)
    const firstMonth = period === '1년' ? addMonths(month ?? '', -11) : period === '3년' ? addMonths(month ?? '', -35) : '0000-00'
    const trend = model.settlements
      .filter((s) => month && s.month <= month && s.month >= firstMonth)
      .map((s) => ({ month: s.month, value: computeSheet(model.accounts, model.valuesOf(s.month).balances, opt).netWorth }))

    const fixedExpense = summarizePnl(model.items, cur.entries).fixed

    return {
      sheet,
      prevSheet,
      assets: rows('asset'),
      debts: rows('liability'),
      sectors: sectorList(cur).map((s, i) => ({ ...s, color: SECTOR_COLORS[i] })),
      sectorTotal: sectorTotal(cur),
      trend,
      fixedExpense,
    }
  }, [model, month, prevMonth, prevSettlement, owners, excludeJeonse, period])

  /** 금액 표시 (통화 반영): Money 컴포넌트에 넘길 값·단위 */
  const money = (won: number) => (usd ? { value: `$${formatUsd(won / (fx as number))}`, unit: '' } : { value: formatWon(won), unit: '원' })
  const moneyText = (won: number) => (usd ? `$${formatUsd(won / (fx as number))}` : `${formatWon(won)}원`)
  const short = (won: number) => (usd ? `$${formatShort(won / (fx as number)).replace('억', '00M').replace('만', '0K')}` : formatShort(won))
  /** 전월 대비 문구·색. tone: 자산·순자산은 늘면 좋음, 부채는 줄면 좋음 */
  const delta = (diff: number | null, upIsGood: boolean): { text: string; tone: Tone } | null => {
    if (diff === null) return null
    const text = usd ? formatDelta(diff / (fx as number), '').replace(/([+−])/, '$1$') : formatDelta(diff)
    const tone: Tone = diff === 0 ? 'neutral' : diff > 0 === upIsGood ? 'good' : 'bad'
    return { text, tone }
  }

  return {
    month,
    setMonth,
    months: model.settlements.map((s) => ({ month: s.month, closed: s.status === 'closed' })),
    settlement,
    hasPrev: Boolean(prevSettlement),
    basisLabel: month ? `${monthEndLabel(month)} ${settlement?.status === 'closed' ? '마감' : '입력'} 기준` : '',
    ownerLabel: owners.length === 3 ? '공동·남편·아내 합산' : owners.length === 0 ? '선택한 소유자 없음' : `${owners.join('·')} 합산`,
    owners,
    setOwners,
    currency,
    setCurrency,
    fx,
    usd,
    excludeJeonse,
    setExcludeJeonse,
    period,
    setPeriod,
    money,
    moneyText,
    short,
    delta,
    ownerLabelOf: (o: AccountOwner) => OWNER_LABEL[o],
    ...view,
  }
}

export type BalanceView = ReturnType<typeof useBalanceView>

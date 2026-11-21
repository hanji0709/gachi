import { useMemo } from 'react'
import { computeSheet } from '../../data/compute'
import type { AccountOwner } from '../../data/ledger'
import type { BalanceSheetModel } from '../../data/useBalanceSheet'

/* ───────── 우리 집 경제적 자유 기준 ───────── */
/** 안전 인출률 (4% 법칙) */
export const SAFE_WITHDRAWAL = 0.04

/** 경제적 자유 목표 (가구마다 '수정'으로 바꿀 수 있음, households 테이블에 저장) */
export interface FireTargets {
  /** 지표 A 목표 자산 */
  asset: number
  /** 지표 B 목표: 부부 생활비 예산 (월) */
  living: number
}

const ALL = new Set<AccountOwner>(['joint', 'husband', 'wife'])

export interface NwPoint {
  month: string
  estate: number
  fin: number
  dep: number
  etc: number
  debt: number
  net: number
}

/** 결산 데이터에서 경제적 자유 화면에 필요한 값 */
export function useFireData(model: BalanceSheetModel, targets: FireTargets) {
  return useMemo(() => {
    const series: NwPoint[] = model.settlements.map((s) => {
      const sheet = computeSheet(model.accounts, model.valuesOf(s.month).balances, { owners: ALL })
      const cat = (label: string) => sheet.assetByCategory.find((c) => c.label === label)?.value ?? 0
      return { month: s.month, estate: cat('부동산'), fin: cat('금융투자'), dep: cat('예적금'), etc: cat('기타'), debt: sheet.totalDebt, net: sheet.netWorth }
    })
    const latest = series[series.length - 1] ?? null
    const latestSheet = latest ? computeSheet(model.accounts, model.valuesOf(latest.month).balances, { owners: ALL }) : null
    const jeonse = latestSheet?.debtByCategory.find((c) => c.label === '전세보증금')?.value ?? 0

    // 최근 3개월 평균 (손익이 입력된 달 기준)
    const recent = model.pnlSettlements.slice(-3)
    const avg = (match: (grp: string, name: string) => boolean) => {
      if (recent.length === 0) return 0
      const ids = model.items.filter((i) => match(i.grp, i.name)).map((i) => i.id)
      const total = recent.reduce((s, st) => s + ids.reduce((x, id) => x + (model.pnlValuesOf(st.month).entries.get(id) ?? 0), 0), 0)
      return Math.round(total / recent.length)
    }
    const passive = avg((g, n) => g === 'income' && /배당|이자/.test(n))
    const invest = avg((g, n) => g === 'saving' && n.includes('투자'))
    const repay = avg((g, n) => g === 'fixed' && n.includes('원금'))

    return { series, latest, jeonse, passive, invest, repay, recentMonths: recent.length, targets }
  }, [model, targets.asset, targets.living]) // eslint-disable-line react-hooks/exhaustive-deps
}

export type FireData = ReturnType<typeof useFireData>

/* ───────── 미래 예측 ───────── */
export interface Assumptions {
  /** 연간 성장률 % */
  re: number
  fin: number
  dep: number
  etc: number
  inf: number
  /** 매달 넣는 돈 (원) */
  invest: number
  repay: number
  /** 예측 기간 (년) */
  years: number
}

export type PresetName = '보수' | '기본' | '낙관'
export const PRESETS: Record<PresetName, Pick<Assumptions, 're' | 'fin' | 'dep' | 'etc'>> = {
  보수: { re: 2, fin: 4, dep: 1.5, etc: 0 },
  기본: { re: 3, fin: 7, dep: 2, etc: 0 },
  낙관: { re: 5, fin: 10, dep: 2.5, etc: 0 },
}

export interface YearPoint {
  year: number
  /** 투자 가능 자산 (금융투자) */
  inv: number
  net: number
  /** 목표 자산 (물가 반영 명목) */
  target: number
  /** 물가 할인 계수 (실질 = 명목 × deflator) */
  deflator: number
}

/** 연 단위 단순 복리: 금융투자에 매달 추가 투자, 전세보증금 외 대출은 매달 원금 상환 */
export function simulate(data: FireData, a: Assumptions): YearPoint[] {
  const l = data.latest
  if (!l) return []
  const startYear = Number(l.month.slice(0, 4))
  let re = l.estate
  let fin = l.fin
  let dep = l.dep
  let etc = l.etc
  let loan = Math.max(0, l.debt - data.jeonse)
  const out: YearPoint[] = []
  for (let t = 0; t <= a.years; t++) {
    if (t > 0) {
      re *= 1 + a.re / 100
      fin = fin * (1 + a.fin / 100) + a.invest * 12
      dep *= 1 + a.dep / 100
      etc *= 1 + a.etc / 100
      loan = Math.max(0, loan - a.repay * 12)
    }
    const infl = (1 + a.inf / 100) ** t
    out.push({ year: startYear + t, inv: fin, net: re + fin + dep + etc - loan - data.jeonse, target: data.targets.asset * infl, deflator: 1 / infl })
  }
  return out
}

/** 투자 가능 자산이 목표 자산(물가 반영)에 처음 닿는 해 (없으면 null) */
export const reachYear = (pts: YearPoint[]) => pts.find((p) => p.inv >= p.target)?.year ?? null

/* ───────── 경제적 자유 레벨 (지표 A·B·C) ───────── */
export interface Indicator {
  key: 'A' | 'B'
  label: string
  /** 달성률 (1 = 100%) */
  ratio: number
  current: number
  target: number
  /** 월 금액이면 true (지표 B·C) */
  monthly: boolean
  note: string
  /** 보조 설명 (지표 A: 낙관·보수 도달 연도) */
  sub?: string
  /** 느낌표 아이콘 안내: 지표 정의 */
  guide: string
}

/** 지표 A 도달 연도 (가정 카드의 '예측해보기' 결과) */
export interface ReachInfo {
  reach: number | null
  lowReach: number | null
  highReach: number | null
  years: number
  startYear: number
}

export function indicators(data: FireData, r: ReachInfo): Indicator[] {
  const { asset: TARGET, living: LIVING } = data.targets
  const inv = data.latest?.fin ?? 0
  const when = (y: number | null) => (y === null ? `${r.years}년 안 어려움` : y <= r.startYear ? '이미 달성' : `${y}년`)
  const eok = (n: number) => `${(n / 1e8).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}억원`
  const man = (n: number) => `${Math.round(n / 1e4).toLocaleString('ko-KR')}만원`
  return [
    {
      key: 'A',
      label: '지표 A · 자산 목표 (4% 법칙)',
      ratio: inv / TARGET,
      current: inv,
      target: TARGET,
      monthly: false,
      note:
        inv >= TARGET
          ? '목표 자산 달성'
          : r.reach !== null
            ? `내 가정 기준 ${r.reach}년 도달 예상 (지금부터 ${r.reach - r.startYear}년)`
            : `내 가정으로는 ${r.years}년 안 도달 어려움`,
      sub: inv >= TARGET ? undefined : `낙관 ${when(r.highReach)} · 보수 ${when(r.lowReach)} · 아래 미래 예측의 가정 기준`,
      guide: `투자 가능 자산(금융투자: 금융투자자산 + 연금저축보험)이 목표 자산 ${eok(TARGET)}에 얼마나 다가왔는지 보여줘요. 4% 법칙은 투자 자산의 연 4%씩 꺼내 써도 원금이 오래 유지된다는 기준이에요. ${eok(TARGET)}이면 연 ${man(TARGET * SAFE_WITHDRAWAL)}(월 ${man((TARGET * SAFE_WITHDRAWAL) / 12)})을 인출할 수 있어요.`,
    },
    {
      key: 'B',
      label: '지표 B · 현금흐름 목표',
      ratio: data.passive / LIVING,
      current: data.passive,
      target: LIVING,
      monthly: true,
      note: `최근 ${data.recentMonths}개월 평균 세후 배당/이자`,
      guide: `최근 ${data.recentMonths}개월 평균 세후 배당·이자 소득이 부부 생활비 예산(월 ${man(LIVING)})을 얼마나 채우는지 보여줘요. 100%가 되면 일하지 않아도 배당·이자만으로 생활비를 충당할 수 있어요.`,
    },
  ]
}

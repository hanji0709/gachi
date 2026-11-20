import type { Account, AccountOwner, MonthValues, PnlGroup, PnlItem, Sector } from './ledger'
import { SECTORS } from './ledger'

/* ───────── 월별 손익 ───────── */
export interface PnlSummary {
  income: number
  fixed: number
  variable: number
  saving: number
  /** 총 지출 = 고정 + 변동 */
  expense: number
  /** 월별 순이익 = 수입 − 지출 */
  net: number
  /** 불일치하는 차액 = 순이익 − 저축/투자/상환 (0이 아니면 입력 누락·오류 가능) */
  mismatch: number
  /** 저축/투자율 = 저축/투자/상환 ÷ 수입 */
  savingRate: number
  /** DSR = (대출 원금 + 대출 이자) ÷ 수입 */
  dsr: number
}

const DEBT_SERVICE_ITEMS = ['대출 원금', '대출 이자']

export function groupTotal(items: PnlItem[], entries: Map<string, number>, grp: PnlGroup): number {
  return items.filter((i) => i.grp === grp).reduce((sum, i) => sum + (entries.get(i.id) ?? 0), 0)
}

export function summarizePnl(items: PnlItem[], entries: Map<string, number>): PnlSummary {
  const income = groupTotal(items, entries, 'income')
  const fixed = groupTotal(items, entries, 'fixed')
  const variable = groupTotal(items, entries, 'variable')
  const saving = groupTotal(items, entries, 'saving')
  const expense = fixed + variable
  const net = income - expense
  const debtService = items
    .filter((i) => i.grp === 'fixed' && DEBT_SERVICE_ITEMS.includes(i.name))
    .reduce((s, i) => s + (entries.get(i.id) ?? 0), 0)
  return {
    income,
    fixed,
    variable,
    saving,
    expense,
    net,
    mismatch: net - saving,
    savingRate: income > 0 ? saving / income : NaN,
    dsr: income > 0 ? debtService / income : NaN,
  }
}

/** 차이 색: 수입·저축은 늘면 좋음, 지출은 늘면 나쁨 */
export function diffTone(grp: PnlGroup, diff: number): 'good' | 'bad' | 'neutral' {
  if (diff === 0) return 'neutral'
  const upIsGood = grp === 'income' || grp === 'saving'
  return (diff > 0) === upIsGood ? 'good' : 'bad'
}

export interface BudgetLine {
  item: PnlItem
  spent: number
  budget: number
  left: number
  /** 사용률 0~100 (막대), 초과분은 overPct */
  pct: number
  overPct: number
}

export function budgetLines(items: PnlItem[], entries: Map<string, number>): BudgetLine[] {
  return items
    .filter((i) => i.grp === 'variable' && i.monthlyBudget !== null && i.monthlyBudget > 0)
    .map((item) => {
      const budget = item.monthlyBudget as number
      const spent = entries.get(item.id) ?? 0
      const over = Math.max(0, spent - budget)
      return {
        item,
        spent,
        budget,
        left: budget - spent,
        // 초과 시 막대 전체를 (예산 + 초과) 기준으로 나눠 초과분만 빨강
        pct: over > 0 ? (budget / spent) * 100 : (spent / budget) * 100,
        overPct: over > 0 ? (over / spent) * 100 : 0,
      }
    })
}

/* ───────── 재무상태표 ───────── */
export interface Composition {
  label: string
  value: number
}

export interface BalanceSheet {
  totalAssets: number
  totalDebt: number
  netWorth: number
  assetByCategory: Composition[]
  debtByCategory: Composition[]
  /** 부채 가중평균이자율 (잔액 가중) */
  weightedRate: number
  /** 부채비율 = 총부채 ÷ 총자산 */
  debtRatio: number
  /** 유동성 자산 = 예적금 합계 */
  liquid: number
  byOwner: Record<AccountOwner, number>
}

export interface SheetOptions {
  /** 포함할 소유자 */
  owners: Set<AccountOwner>
  /** 전세보증금을 부채에서 뺄지 */
  excludeJeonse?: boolean
}

const balanceOf = (a: Account, balances: Map<string, number>) => balances.get(a.id) ?? 0

export function computeSheet(accounts: Account[], balances: Map<string, number>, opt: SheetOptions): BalanceSheet {
  const included = accounts.filter((a) => opt.owners.has(a.owner))
  const assets = included.filter((a) => a.kind === 'asset')
  const debts = included.filter((a) => a.kind === 'liability' && !(opt.excludeJeonse && a.category === '전세보증금'))
  const sum = (list: Account[]) => list.reduce((s, a) => s + balanceOf(a, balances), 0)
  const totalAssets = sum(assets)
  const totalDebt = sum(debts)

  const byCat = (list: Account[], cats: readonly string[]) =>
    cats.map((label) => ({ label, value: sum(list.filter((a) => a.category === label)) }))

  const rated = debts.filter((a) => a.interestRate !== null)
  const ratedTotal = sum(rated)
  const weightedRate = ratedTotal > 0 ? rated.reduce((s, a) => s + balanceOf(a, balances) * (a.interestRate as number), 0) / ratedTotal : NaN

  const byOwner: Record<AccountOwner, number> = { joint: 0, husband: 0, wife: 0 }
  for (const a of included) {
    if (a.kind === 'liability' && opt.excludeJeonse && a.category === '전세보증금') continue
    byOwner[a.owner] += (a.kind === 'asset' ? 1 : -1) * balanceOf(a, balances)
  }

  return {
    totalAssets,
    totalDebt,
    netWorth: totalAssets - totalDebt,
    assetByCategory: byCat(assets, ['부동산', '금융투자', '예적금', '연금', '기타']),
    debtByCategory: byCat(debts, ['주택담보대출', '전세보증금', '신용대출', '기타대출']),
    weightedRate,
    debtRatio: totalAssets > 0 ? totalDebt / totalAssets : NaN,
    liquid: sum(assets.filter((a) => a.category === '예적금')),
    byOwner,
  }
}

export function sectorList(values: MonthValues): { sector: Sector; amount: number; share: number }[] {
  const total = SECTORS.reduce((s, k) => s + (values.sectors.get(k) ?? 0), 0)
  return SECTORS.map((sector) => {
    const amount = values.sectors.get(sector) ?? 0
    return { sector, amount, share: total > 0 ? amount / total : 0 }
  })
}

export const sectorTotal = (values: MonthValues) => SECTORS.reduce((s, k) => s + (values.sectors.get(k) ?? 0), 0)

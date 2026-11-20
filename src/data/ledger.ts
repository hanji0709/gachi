import { supabase } from '../lib/supabase'
import { monthKey, monthToDate } from './format'

/* ───────── 타입 ───────── */
export type AccountKind = 'asset' | 'liability'
export type AccountOwner = 'joint' | 'husband' | 'wife'
export type PnlGroup = 'income' | 'fixed' | 'variable' | 'saving'
export type SettlementStatus = 'in_progress' | 'closed'

export const ASSET_CATEGORIES = ['부동산', '금융투자', '예적금', '연금', '기타'] as const
export const LIABILITY_CATEGORIES = ['주택담보대출', '전세보증금', '신용대출', '기타대출'] as const
export const SECTORS = ['시장지수', 'AI하드웨어', '첨단산업', 'AI소프트웨어', '채권', '암호화폐', '바이오/헬스', '기타'] as const
export type Sector = (typeof SECTORS)[number]

export const OWNER_LABEL: Record<AccountOwner, '공동' | '남편' | '아내'> = { joint: '공동', husband: '남편', wife: '아내' }

export interface Account {
  id: string
  kind: AccountKind
  name: string
  category: string
  owner: AccountOwner
  interestRate: number | null
  sortOrder: number
  /** 목록에서 숨긴 자산·부채 (지난 결산 계산에는 포함) */
  archived: boolean
}

export interface Settlement {
  id: string
  month: string // "2026-10"
  status: SettlementStatus
  fxRate: number | null
  husbandConfirmedAt: string | null
  wifeConfirmedAt: string | null
  closedAt: string | null
  updatedAt: string
}

export interface PnlItem {
  id: string
  grp: PnlGroup
  name: string
  monthlyBudget: number | null
  sortOrder: number
}

/** 결산월 하나의 금액들 */
export interface MonthValues {
  balances: Map<string, number> // accountId → 원
  entries: Map<string, number> // pnlItemId → 원
  sectors: Map<Sector, number>
}

export const emptyValues = (): MonthValues => ({ balances: new Map(), entries: new Map(), sectors: new Map() })

/* ───────── 변환 ───────── */
type Row = Record<string, unknown>
const toAccount = (r: Row): Account => ({
  id: r.id as string,
  kind: r.kind as AccountKind,
  name: r.name as string,
  category: r.category as string,
  owner: r.owner as AccountOwner,
  interestRate: r.interest_rate === null ? null : Number(r.interest_rate),
  sortOrder: r.sort_order as number,
  archived: Boolean(r.archived),
})
const toSettlement = (r: Row): Settlement => ({
  id: r.id as string,
  month: monthKey(r.month as string),
  status: r.status as SettlementStatus,
  fxRate: r.fx_rate === null ? null : Number(r.fx_rate),
  husbandConfirmedAt: (r.husband_confirmed_at as string | null) ?? null,
  wifeConfirmedAt: (r.wife_confirmed_at as string | null) ?? null,
  closedAt: (r.closed_at as string | null) ?? null,
  updatedAt: r.updated_at as string,
})
const toItem = (r: Row): PnlItem => ({
  id: r.id as string,
  grp: r.grp as PnlGroup,
  name: r.name as string,
  monthlyBudget: r.monthly_budget === null ? null : Number(r.monthly_budget),
  sortOrder: r.sort_order as number,
})

/** Supabase 응답에서 오류면 던지고, 아니면 데이터 */
function check<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw res.error
  return res.data as NonNullable<T>
}

/* ───────── 조회 ───────── */
export async function fetchAccounts(householdId: string, { includeArchived = false } = {}): Promise<Account[]> {
  let q = supabase
    .from('accounts')
    .select('id, kind, name, category, owner, interest_rate, sort_order, archived')
    .eq('household_id', householdId)
  if (!includeArchived) q = q.eq('archived', false)
  const rows = check(
    await q
      .order('sort_order')
      .order('created_at'),
  )
  return (rows ?? []).map(toAccount)
}

export async function fetchPnlItems(householdId: string): Promise<PnlItem[]> {
  const rows = check(
    await supabase
      .from('pnl_items')
      .select('id, grp, name, monthly_budget, sort_order')
      .eq('household_id', householdId)
      .eq('archived', false)
      .order('sort_order'),
  )
  return (rows ?? []).map(toItem)
}

export async function fetchSettlements(householdId: string): Promise<Settlement[]> {
  const rows = check(
    await supabase
      .from('settlements')
      .select('id, month, status, fx_rate, husband_confirmed_at, wife_confirmed_at, closed_at, updated_at')
      .eq('household_id', householdId)
      .order('month'),
  )
  return (rows ?? []).map(toSettlement)
}

/** 여러 결산월의 금액을 한 번에 */
export async function fetchValues(settlementIds: string[]): Promise<Map<string, MonthValues>> {
  const out = new Map<string, MonthValues>()
  settlementIds.forEach((id) => out.set(id, emptyValues()))
  if (settlementIds.length === 0) return out
  const [balances, entries, sectors] = await Promise.all([
    supabase.from('account_balances').select('settlement_id, account_id, amount').in('settlement_id', settlementIds),
    supabase.from('pnl_entries').select('settlement_id, item_id, amount').in('settlement_id', settlementIds),
    supabase.from('sector_amounts').select('settlement_id, sector, amount').in('settlement_id', settlementIds),
  ])
  for (const r of check(balances) ?? []) out.get(r.settlement_id)?.balances.set(r.account_id, Number(r.amount))
  for (const r of check(entries) ?? []) out.get(r.settlement_id)?.entries.set(r.item_id, Number(r.amount))
  for (const r of check(sectors) ?? []) out.get(r.settlement_id)?.sectors.set(r.sector as Sector, Number(r.amount))
  return out
}

/* ───────── 저장 ───────── */
/** 결산월 행이 없으면 만들고 돌려줌 (배우자가 동시에 만든 경우 그 행을 사용) */
export async function ensureSettlement(householdId: string, month: string): Promise<Settlement> {
  const ins = await supabase
    .from('settlements')
    .insert({ household_id: householdId, month: monthToDate(month) })
    .select('id, month, status, fx_rate, husband_confirmed_at, wife_confirmed_at, closed_at, updated_at')
    .maybeSingle()
  if (!ins.error && ins.data) return toSettlement(ins.data)
  // 23505 = unique 위반: 이미 있음
  const existing = check(
    await supabase
      .from('settlements')
      .select('id, month, status, fx_rate, husband_confirmed_at, wife_confirmed_at, closed_at, updated_at')
      .eq('household_id', householdId)
      .eq('month', monthToDate(month))
      .single(),
  )
  return toSettlement(existing as Row)
}

export async function upsertBalances(settlementId: string, rows: { accountId: string; amount: number }[]) {
  if (rows.length === 0) return
  check(
    await supabase
      .from('account_balances')
      .upsert(rows.map((r) => ({ settlement_id: settlementId, account_id: r.accountId, amount: r.amount }))),
  )
}

export async function upsertEntries(settlementId: string, rows: { itemId: string; amount: number }[]) {
  if (rows.length === 0) return
  check(
    await supabase.from('pnl_entries').upsert(rows.map((r) => ({ settlement_id: settlementId, item_id: r.itemId, amount: r.amount }))),
  )
}

export async function upsertSectors(settlementId: string, rows: { sector: Sector; amount: number }[]) {
  if (rows.length === 0) return
  check(
    await supabase.from('sector_amounts').upsert(rows.map((r) => ({ settlement_id: settlementId, sector: r.sector, amount: r.amount }))),
  )
}

export async function updateSettlement(
  settlementId: string,
  patch: Partial<{
    fx_rate: number | null
    status: SettlementStatus
    husband_confirmed_at: string | null
    wife_confirmed_at: string | null
    closed_at: string | null
  }>,
) {
  check(await supabase.from('settlements').update(patch).eq('id', settlementId))
}

/* ───────── 자산·부채 · 항목 관리 ───────── */
export interface NewAccount {
  kind: AccountKind
  name: string
  category: string
  owner: AccountOwner
  interestRate: number | null
}

export async function createAccount(householdId: string, a: NewAccount, sortOrder: number): Promise<Account> {
  const row = check(
    await supabase
      .from('accounts')
      .insert({
        household_id: householdId,
        kind: a.kind,
        name: a.name.trim(),
        category: a.category,
        owner: a.owner,
        interest_rate: a.kind === 'liability' ? a.interestRate : null,
        sort_order: sortOrder,
      })
      .select('id, kind, name, category, owner, interest_rate, sort_order, archived')
      .single(),
  )
  return toAccount(row as Row)
}

/** 목록에서 숨김 (지난 결산의 잔액 기록은 남김) */
export async function archiveAccount(accountId: string) {
  check(await supabase.from('accounts').update({ archived: true }).eq('id', accountId))
}

export async function updateBudget(itemId: string, budget: number | null) {
  check(await supabase.from('pnl_items').update({ monthly_budget: budget }).eq('id', itemId))
}

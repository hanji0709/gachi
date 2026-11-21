import { supabase } from '../lib/supabase'
import { readSheet, type Cell } from '../lib/xlsx'
import {
  ASSET_CATEGORIES,
  LIABILITY_CATEGORIES,
  ensureSettlement,
  fetchAccounts,
  fetchPnlItems,
  fetchSettlements,
  fetchValues,
  updateSettlement,
  upsertBalances,
  upsertEntries,
  upsertSectors,
  type Account,
  type AccountKind,
  type PnlGroup,
  type PnlItem,
  type Sector,
} from './ledger'

/**
 * 백데이터 엑셀(같이성장_재무손익_통합관리마스터)의 [결산입력_마스터] 시트 → 결산월 하나에 반영.
 * 시트 구조: B열 섹션 · C열 카테고리 · D열 세부항목명 · 5행에 결산월(2025-08 …) 머리글.
 */
export const MASTER_SHEET = '결산입력_마스터'

const ASSET_CAT: Record<string, string> = { 부동산: '부동산', '금융 투자': '금융투자', 금융투자: '금융투자', 예적금: '예적금', 기타자산: '기타', 기타: '기타' }
/** 이름만 바뀐 같은 계좌 */
const MERGE_NAME: Record<string, string> = { '비상금,예금 등': '비상금' }
const SECTOR_KEY: Record<string, Sector> = {
  'market index': '시장지수',
  'ai hardware': 'AI하드웨어',
  'new growth industries': '첨단산업',
  'ai software': 'AI소프트웨어',
  bonds: '채권',
  crypto: '암호화폐',
  'bio/health': '바이오/헬스',
  other: '기타',
}

export interface ExcelMonth {
  month: string
  fx: number | null
  balances: { kind: AccountKind; name: string; category: string; amount: number }[]
  /** 대출 이름 → 연 이자율(%) */
  rates: Map<string, number>
  entries: { grp: PnlGroup; name: string; amount: number }[]
  weights: Map<Sector, number>
}

const text = (c: Cell | undefined) => (c === null || c === undefined ? '' : String(c).trim())
const num = (c: Cell | undefined) => (typeof c === 'number' && Number.isFinite(c) ? c : typeof c === 'string' && c.trim() !== '' && !Number.isNaN(Number(c.replace(/,/g, ''))) ? Number(c.replace(/,/g, '')) : 0)

/** 머리글 칸 → "YYYY-MM" (글자 "2025-08" 또는 엑셀 날짜 일련번호) */
function monthOf(c: Cell | undefined): string | null {
  if (typeof c === 'string') {
    const m = c.trim().match(/^(\d{4})[-./년\s]*(\d{1,2})/)
    return m ? `${m[1]}-${m[2].padStart(2, '0')}` : null
  }
  if (typeof c === 'number' && c > 20000 && c < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + c * 86400000)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  }
  return null
}

/** 엑셀 파일 → 결산월별 값 */
export async function parseMasterFile(file: File): Promise<ExcelMonth[]> {
  const rows = await readSheet(file, MASTER_SHEET)
  const headerIdx = rows.findIndex((r) => (r ?? []).filter((c) => monthOf(c)).length >= 3)
  if (headerIdx < 0) throw new Error(`'${MASTER_SHEET}' 시트에서 결산월(예: 2025-08) 머리글을 찾지 못했어요.`)
  const header = rows[headerIdx]
  const cols: { col: number; month: string }[] = []
  header.forEach((c, col) => {
    const m = monthOf(c)
    if (m && !cols.some((x) => x.month === m)) cols.push({ col, month: m })
  })

  const body = rows.slice(headerIdx + 1).filter(Boolean)
  const section = (r: Cell[]) => text(r[1])
  const out: ExcelMonth[] = []
  for (const { col, month } of cols) {
    const em: ExcelMonth = { month, fx: null, balances: [], rates: new Map(), entries: [], weights: new Map() }
    for (const r of body) {
      const sec = section(r)
      const cat = text(r[2])
      const name = text(r[3])
      const v = num(r[col])
      if (!sec) continue
      if (sec.startsWith('0. 환율')) em.fx = v > 0 ? v : null
      else if (sec.startsWith('1. 자산입력') && name) {
        const n = MERGE_NAME[name] ?? name
        const prev = em.balances.find((b) => b.kind === 'asset' && b.name === n)
        if (prev) prev.amount += Math.round(v)
        else em.balances.push({ kind: 'asset', name: n, category: ASSET_CAT[cat] ?? '기타', amount: Math.round(v) })
      } else if (sec.startsWith('2-1. 부채잔액') && name) {
        const category = (LIABILITY_CATEGORIES as readonly string[]).includes(cat) ? cat : '기타대출'
        em.balances.push({ kind: 'liability', name, category, amount: Math.round(v) })
      } else if (sec.startsWith('2-2. 대출금리') && name && v > 0) {
        // 0.0487 처럼 소수로 입력 (1보다 크면 이미 %로 입력한 것으로 봄)
        em.rates.set(name, Math.round((v < 1 ? v * 100 : v) * 10000) / 10000)
      } else if (sec.startsWith('3. 수입입력') && name) em.entries.push({ grp: 'income', name, amount: Math.round(v) })
      else if (sec.startsWith('4. 고정지출') && name) em.entries.push({ grp: 'fixed', name, amount: Math.round(v) })
      else if (sec.startsWith('5. 변동지출') && name) em.entries.push({ grp: 'variable', name, amount: Math.round(v) })
      else if (sec.startsWith('6. 잉여현금배분') && cat === '투자') em.entries.push({ grp: 'saving', name: '총투자액', amount: Math.round(v) })
      else if (sec.startsWith('6. 잉여현금배분') && cat === '저축/상환 소계') em.entries.push({ grp: 'saving', name: '총저축/상환액', amount: Math.round(v) })
      else if (sec.startsWith('7. 투자섹터비중')) {
        const s = SECTOR_KEY[cat.toLowerCase()]
        if (s) em.weights.set(s, v)
      }
    }
    // 값이 하나라도 있는 달만
    if (em.balances.some((b) => b.amount > 0) || em.entries.some((e) => e.amount > 0)) out.push(em)
  }
  if (out.length === 0) throw new Error(`'${MASTER_SHEET}' 시트에 입력된 결산월이 없어요.`)
  return out
}

/* ───────── 가져오기 계획 (새 항목 확인용) ───────── */
export interface ImportPlan {
  data: ExcelMonth
  /** 웹사이트에 아직 없는 자산·부채 (이번 달 금액이 있는 것만) */
  newAccounts: { kind: AccountKind; name: string; category: string; amount: number }[]
  /** 웹사이트에 아직 없는 손익 항목 */
  newItems: { grp: PnlGroup; name: string; amount: number }[]
  /** 덮어쓸 값 개수 */
  valueCount: number
}

export function planImport(data: ExcelMonth, accounts: Account[], items: PnlItem[]): ImportPlan {
  const hasAccount = (kind: AccountKind, name: string) => accounts.some((a) => a.kind === kind && a.name === name)
  const hasItem = (grp: PnlGroup, name: string) => items.some((i) => i.grp === grp && i.name === name)
  return {
    data,
    newAccounts: data.balances.filter((b) => b.amount !== 0 && !hasAccount(b.kind, b.name)),
    newItems: data.entries.filter((e) => e.amount !== 0 && !hasItem(e.grp, e.name)),
    valueCount: data.balances.filter((b) => b.amount !== 0).length + data.entries.filter((e) => e.amount !== 0).length,
  }
}

/** 계획대로 반영: 새 항목 만들기 → 잔액·손익·섹터·환율·금리 저장 */
export async function applyImport(householdId: string, plan: ImportPlan): Promise<void> {
  const { data } = plan
  const check = <T,>(res: { data: T; error: unknown }) => {
    if (res.error) throw res.error
    return res.data
  }

  // 1) 새 자산·부채, 새 손익 항목
  let accounts = await fetchAccounts(householdId, { includeArchived: true })
  let items = await fetchPnlItems(householdId)
  if (plan.newAccounts.length > 0) {
    const base = accounts.length
    check(
      await supabase.from('accounts').insert(
        plan.newAccounts.map((a, i) => ({
          household_id: householdId,
          kind: a.kind,
          name: a.name,
          category: a.kind === 'asset' ? ((ASSET_CATEGORIES as readonly string[]).includes(a.category) ? a.category : '기타') : a.category,
          owner: 'joint',
          interest_rate: a.kind === 'liability' ? (data.rates.get(a.name) ?? null) : null,
          sort_order: base + i + 1,
        })),
      ),
    )
    accounts = await fetchAccounts(householdId, { includeArchived: true })
  }
  if (plan.newItems.length > 0) {
    check(
      await supabase.from('pnl_items').insert(
        plan.newItems.map((it) => ({
          household_id: householdId,
          grp: it.grp,
          name: it.name,
          sort_order: items.filter((x) => x.grp === it.grp).length + plan.newItems.filter((x) => x.grp === it.grp).indexOf(it) + 1,
        })),
      ),
    )
    items = await fetchPnlItems(householdId)
  }

  // 2) 결산월 + 지금 저장된 값 (엑셀에서 0이 된 칸은 0으로 덮기 위해)
  const settlement = (await fetchSettlements(householdId)).find((s) => s.month === data.month) ?? (await ensureSettlement(householdId, data.month))
  if (settlement.status === 'closed') throw new Error(`${data.month} 결산은 마감되어 있어요. 마감을 해제한 뒤 다시 올려 주세요.`)
  const current = (await fetchValues([settlement.id])).get(settlement.id)

  const accountOf = (kind: AccountKind, name: string) => accounts.find((a) => a.kind === kind && a.name === name)
  const balances = data.balances
    .map((b) => ({ acc: accountOf(b.kind, b.name), amount: b.amount }))
    .filter((x): x is { acc: Account; amount: number } => Boolean(x.acc) && (x.amount !== 0 || Boolean(current?.balances.has(x.acc!.id))))
    .map((x) => ({ accountId: x.acc.id, amount: Math.max(0, x.amount) }))
  const entries = data.entries
    .map((e) => ({ item: items.find((i) => i.grp === e.grp && i.name === e.name), amount: e.amount }))
    .filter((x): x is { item: PnlItem; amount: number } => Boolean(x.item) && (x.amount !== 0 || Boolean(current?.entries.has(x.item!.id))))
    .map((x) => ({ itemId: x.item.id, amount: Math.max(0, x.amount) }))

  // 섹터 금액 = 비중(합 100%로 맞춤) × 금융투자 총액. 반올림 차이는 가장 큰 섹터에서 맞춤
  const invest = balances.reduce((s, b) => s + (accounts.find((a) => a.id === b.accountId)?.category === '금융투자' ? b.amount : 0), 0)
  const wTotal = [...data.weights.values()].reduce((s, w) => s + w, 0)
  const sectors: { sector: Sector; amount: number }[] = []
  if (wTotal > 0 && invest > 0) {
    for (const [sector, w] of data.weights) sectors.push({ sector, amount: Math.round((invest * w) / wTotal) })
    const big = sectors.reduce((a, b) => (b.amount > a.amount ? b : a))
    big.amount += invest - sectors.reduce((s, x) => s + x.amount, 0)
  }

  await Promise.all([
    upsertBalances(settlement.id, balances),
    upsertEntries(settlement.id, entries),
    upsertSectors(settlement.id, sectors),
    data.fx ? updateSettlement(settlement.id, { fx_rate: data.fx }) : Promise.resolve(),
    // 대출 금리: 계좌마다 최신 금리 하나
    ...[...data.rates].map(([name, rate]) => {
      const acc = accountOf('liability', name)
      return acc && acc.interestRate !== rate ? supabase.from('accounts').update({ interest_rate: rate }).eq('id', acc.id).then(check) : Promise.resolve()
    }),
  ])
}

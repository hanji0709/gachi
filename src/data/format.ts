/** 숫자 표기 규칙 (스타일 가이드 2 · 숫자 표기) */

/** 1234567 → "1,234,567" (음수는 − 부호 U+2212) */
export function formatNumber(n: number, fractionDigits = 0): string {
  const abs = Math.abs(n).toLocaleString('ko-KR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })
  return n < 0 ? `−${abs}` : abs
}

/** 원화 금액 (단위 없이 숫자만) */
export const formatWon = (n: number) => formatNumber(Math.round(n))

/** 달러 금액 숫자 (소수 둘째 자리) */
export const formatUsd = (n: number) => formatNumber(n, 2)

/** 비율 (소수 둘째 자리 + %) */
export function formatPct(ratio: number, digits = 2): string {
  if (!Number.isFinite(ratio)) return '–'
  return `${(ratio * 100).toFixed(digits)}%`
}

/** 요약 카드·차트 축용 축약: 1억 이상은 "12.35억", 그 아래는 "1,235만" */
export function formatShort(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(2)}억`
  if (abs >= 1e4) return `${sign}${formatNumber(Math.round(abs / 1e4))}만`
  return `${sign}${formatNumber(abs)}`
}

/** 증감 표시: ▲ +1,234원 / ▼ −1,234원 / 0원 */
export function formatDelta(n: number, unit = '원'): string {
  if (n === 0) return `0${unit}`
  return `${n > 0 ? '▲ +' : '▼ −'}${formatNumber(Math.abs(Math.round(n)))}${unit}`
}

/** 입력칸 글자 → 원 단위 정수 (쉼표·공백·원 제거). 숫자가 아니면 null */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[,\s원₩]/g, '')
  if (cleaned === '') return 0
  if (!/^\d+$/.test(cleaned)) return null
  const n = Number(cleaned)
  return Number.isSafeInteger(n) ? n : null
}

/** 환율 입력 (소수 허용) */
export function parseRate(text: string): number | null {
  const cleaned = text.replace(/[,\s]/g, '')
  if (cleaned === '') return null
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Number(cleaned)
}

/** 결산월 키: Date|문자열 → "2026-10" */
export const monthKey = (iso: string) => iso.slice(0, 7)
/** "2026-10" → DB 저장값 "2026-10-01" */
export const monthToDate = (key: string) => `${key}-01`
/** "2026-10" → { year: 2026, month: 10 } */
export function splitMonth(key: string) {
  const [y, m] = key.split('-').map(Number)
  return { year: y, month: m }
}
/** "2026-10" + n개월 */
export function addMonths(key: string, n: number): string {
  const { year, month } = splitMonth(key)
  const d = new Date(Date.UTC(year, month - 1 + n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
/** 이번 달 키 */
export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
/** 결산월 마지막 날 "2026년 10월 31일" */
export function monthEndLabel(key: string): string {
  const { year, month } = splitMonth(key)
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${year}년 ${month}월 ${last}일`
}

import { useSearchParams } from 'react-router-dom'
import { addMonths, currentMonthKey } from '../../data/format'

/**
 * 결산월: 주소의 ?m=2026-10 (새로고침·공유해도 같은 달).
 * 없으면 지난달 — 보통 월초에 지난달을 결산하므로.
 */
export function useSettleMonth() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('m')
  const thisMonth = currentMonthKey()
  const month = raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) && raw <= thisMonth ? raw : addMonths(thisMonth, -1)
  const setMonth = (m: string) =>
    setParams(
      (p) => {
        p.set('m', m)
        return p
      },
      { replace: true },
    )
  return { month, setMonth, thisMonth }
}

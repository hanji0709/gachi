import { useSettlement } from '../../data/useSettlement'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { MSettle } from './MSettle'
import { PcSettle } from './PcSettle'
import { useSettleMonth } from './useSettleMonth'

export function SettlePage() {
  const isMobile = useIsMobile()
  const { month, setMonth, thisMonth } = useSettleMonth()
  const model = useSettlement(month)
  const props = { model, month, thisMonth, onMonthChange: setMonth }
  return isMobile ? <MSettle {...props} /> : <PcSettle {...props} />
}

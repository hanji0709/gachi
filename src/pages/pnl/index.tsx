import { useIsMobile } from '../../hooks/useMediaQuery'
import { MPnl } from './MPnl'
import { PcPnl } from './PcPnl'

export function PnlPage() {
  const isMobile = useIsMobile()
  return isMobile ? <MPnl /> : <PcPnl />
}

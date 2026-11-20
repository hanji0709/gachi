import { useIsMobile } from '../../hooks/useMediaQuery'
import { MCash } from './MCash'
import { PcCash } from './PcCash'

export function CashPage() {
  const isMobile = useIsMobile()
  return isMobile ? <MCash /> : <PcCash />
}

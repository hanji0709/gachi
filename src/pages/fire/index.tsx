import { useIsMobile } from '../../hooks/useMediaQuery'
import { MFire } from './MFire'
import { PcFire } from './PcFire'
import { PcForecast } from './PcForecast'

/** /fire — 경제적 자유 · 달성 현황 */
export function FirePage() {
  const isMobile = useIsMobile()
  return isMobile ? <MFire tab="status" /> : <PcFire />
}

/** /fire/forecast — 경제적 자유 · 미래 예측 */
export function ForecastPage() {
  const isMobile = useIsMobile()
  return isMobile ? <MFire tab="forecast" /> : <PcForecast />
}

import { useBalanceSheet } from '../../data/useBalanceSheet'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { MBalance } from './MBalance'
import { BalanceEmpty, BalanceError } from './parts'
import { PcBalance } from './PcBalance'
import { useBalanceView } from './useBalanceView'

export function BalancePage() {
  const isMobile = useIsMobile()
  const model = useBalanceSheet()
  const view = useBalanceView(model)

  if (model.error) return <BalanceError message={model.error} onRetry={() => void model.reload()} />
  // 불러오는 동안은 빈 화면(페이지 전환 애니메이션이 덮음), 결산이 없으면 안내
  if (model.loading) return null
  if (!view.month) return <BalanceEmpty compact={isMobile} />
  return isMobile ? <MBalance view={view} /> : <PcBalance view={view} />
}

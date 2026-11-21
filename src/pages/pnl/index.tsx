import { useBalanceSheet } from '../../data/useBalanceSheet'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { BalanceError } from '../balance/parts'
import { MPnl } from './MPnl'
import { PcPnl } from './PcPnl'
import { usePnlView } from './usePnlView'

export function PnlPage() {
  const isMobile = useIsMobile()
  const model = useBalanceSheet()
  const p = usePnlView(model)
  if (model.error) return <BalanceError message={model.error} onRetry={() => void model.reload()} />
  if (model.loading) return null
  return isMobile ? <MPnl p={p} /> : <PcPnl p={p} />
}

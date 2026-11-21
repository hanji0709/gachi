import { useAuth } from '../../auth/AuthProvider'
import { useBalanceSheet } from '../../data/useBalanceSheet'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { BalanceEmpty, BalanceError } from '../balance/parts'
import { useFireData } from './fireModel'
import { MFire } from './MFire'
import { PcFire } from './PcFire'

/** /fire — 경제적 자유 (달성 현황 + 미래 예측) */
export function FirePage() {
  const isMobile = useIsMobile()
  const model = useBalanceSheet()
  const { household } = useAuth()
  const data = useFireData(model, { asset: household?.fireTargetAsset ?? 1_200_000_000, living: household?.fireLivingCost ?? 2_400_000 })
  if (model.error) return <BalanceError message={model.error} onRetry={() => void model.reload()} />
  if (model.loading) return null
  if (!data.latest) return <BalanceEmpty compact={isMobile} />
  return isMobile ? <MFire data={data} /> : <PcFire data={data} />
}

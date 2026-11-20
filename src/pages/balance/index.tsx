import { useLayoutEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from '../../animation/gsap'
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
  useCurrencyFade(view.currency)

  if (model.error) return <BalanceError message={model.error} onRetry={() => void model.reload()} />
  // 불러오는 동안은 빈 화면(페이지 전환 애니메이션이 덮음), 결산이 없으면 안내
  if (model.loading) return null
  if (!view.month) return <BalanceEmpty compact={isMobile} />
  return isMobile ? <MBalance view={view} /> : <PcBalance view={view} />
}

/**
 * 원/달러를 바꿀 때 카드 안 금액이 툭 바뀌지 않도록 살짝 흐렸다가 또렷하게.
 * 상단 슬롯 숫자는 스스로 다시 굴러가므로 제외(슬롯이 든 칸은 건너뜀).
 */
function useCurrencyFade(currency: string) {
  const prev = useRef(currency)
  useLayoutEffect(() => {
    if (prev.current === currency) return
    prev.current = currency
    if (prefersReducedMotion()) return
    const targets = gsap.utils.toArray<HTMLElement>('main .card > :not(.card-header):not(:has(.slot))')
    gsap.fromTo(targets, { opacity: 0.2 }, { opacity: 1, duration: 0.45, ease: 'power2.out', overwrite: 'auto', clearProps: 'opacity' })
  }, [currency])
}

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { gsap, prefersReducedMotion, ScrollTrigger } from './gsap'
import { FixedLayer, useSmoother } from './SmoothScroll'
import { useScrollEffects } from './useScrollEffects'

/**
 * SPA 화면 전환: 이전 화면을 위로 흐리게 내보내고(0.3s) →
 * 맨 위로 이동 → 새 화면을 아래에서 떠오르게(0.6s). 상단에 진행 막대 표시.
 */
export function PageTransition() {
  const location = useLocation()
  const outlet = useOutlet()
  const smoother = useSmoother()
  const pageRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState<{ key: string; el: ReactNode }>({ key: location.pathname, el: outlet })
  const leaving = location.pathname !== shown.key
  const firstRun = useRef(true)

  // 나가기
  useEffect(() => {
    if (!leaving) {
      if (firstRun.current) {
        firstRun.current = false
        return
      }
      // 나가는 도중 원래 화면으로 되돌아온 경우: 다시 보이게
      gsap.to(pageRef.current, { autoAlpha: 1, y: 0, duration: 0.3, clearProps: 'transform,opacity,visibility' })
      gsap.to(barRef.current, { autoAlpha: 0, duration: 0.2 })
      return
    }
    const next = { key: location.pathname, el: outlet }
    if (prefersReducedMotion()) {
      setShown(next)
      return
    }
    const tl = gsap.timeline({ onComplete: () => setShown(next) })
    tl.set(barRef.current, { autoAlpha: 1, scaleX: 0 })
      .to(barRef.current, { scaleX: 0.7, duration: 0.3, ease: 'power2.out' }, 0)
      .to(pageRef.current, { autoAlpha: 0, y: -28, duration: 0.3, ease: 'power2.in' }, 0)
    return () => {
      tl.kill()
    }
    // outlet은 경로가 바뀔 때 함께 바뀌므로 경로만 의존
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // 들어오기
  useLayoutEffect(() => {
    if (smoother) smoother.scrollTop(0)
    else window.scrollTo(0, 0)
    ScrollTrigger.refresh()
    if (prefersReducedMotion()) return
    gsap.fromTo(
      pageRef.current,
      { autoAlpha: 0, y: 40 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.6,
        ease: 'power3.out',
        clearProps: 'transform,opacity,visibility',
        // 들어오는 동안 y가 밀려 있던 상태로 계산된 고정(pin)·트리거 위치를 다시 계산
        onComplete: () => ScrollTrigger.refresh(),
      },
    )
    gsap.to(barRef.current, { scaleX: 1, duration: 0.25, ease: 'power1.out' })
    gsap.to(barRef.current, { autoAlpha: 0, duration: 0.3, delay: 0.25 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.key])

  useScrollEffects(pageRef, shown.key, smoother)

  return (
    <>
      <div ref={pageRef} key={shown.key} className="page-root">
        {/* 같은 경로에서 다시 그려질 때(예: PC↔모바일 전환)는 최신 화면을 그대로 사용 */}
        {leaving ? shown.el : outlet}
      </div>
      <FixedLayer>
        <div ref={barRef} className="route-progress" aria-hidden="true" />
      </FixedLayer>
    </>
  )
}

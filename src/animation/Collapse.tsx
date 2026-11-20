import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { gsap, prefersReducedMotion, ScrollTrigger } from './gsap'

interface CollapseProps {
  open: boolean
  children: ReactNode
  id?: string
  /** 안쪽 목록(자식들을 감싸는 요소) 스타일 — 예: flex 세로 정렬, gap */
  innerStyle?: CSSProperties
  /** 바깥(높이가 변하는) 요소 스타일 */
  style?: CSSProperties
}

/**
 * 부드럽게 펼치고 접는 영역.
 * - 펼칠 때: 높이 0 → 내용 높이, 항목은 위에서부터 차례로 내려오며 나타남
 * - 접을 때: 항목은 아래에서부터 차례로 위로 사라지고, 높이 → 0
 * 접힌 내용은 visibility: hidden이라 키보드·화면 낭독기에서도 건너뛴다.
 * 항목은 opacity만 건드리므로, 안에 중첩된 Collapse의 숨김(visibility) 상태를 덮어쓰지 않는다.
 */
export function Collapse({ open, children, id, innerStyle, style }: CollapseProps) {
  const ref = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const firstRun = useRef(true)

  useLayoutEffect(() => {
    const el = ref.current
    const inner = innerRef.current
    if (!el || !inner) return
    const items = Array.from(inner.children)

    // 처음 그릴 때와 '동작 줄이기'에서는 바로 최종 상태로
    if (firstRun.current || prefersReducedMotion()) {
      firstRun.current = false
      gsap.set(el, open ? { height: 'auto', autoAlpha: 1 } : { height: 0, autoAlpha: 0 })
      gsap.set(items, { opacity: 1, y: 0 })
      return
    }

    gsap.killTweensOf([el, ...items])
    const tl = gsap.timeline({
      // 높이가 바뀌면 아래쪽 스크롤 애니메이션 위치를 다시 계산
      onComplete: () => ScrollTrigger.refresh(),
    })
    if (open) {
      tl.set(el, { autoAlpha: 1 })
        .fromTo(el, { height: el.offsetHeight }, { height: 'auto', duration: 0.45, ease: 'power2.out' })
        .fromTo(
          items,
          { opacity: 0, y: -12 },
          { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.05 },
          0.05,
        )
    } else {
      tl.to(items, { opacity: 0, y: -12, duration: 0.2, ease: 'power1.in', stagger: { each: 0.04, from: 'end' } })
        .to(el, { height: 0, duration: 0.4, ease: 'power2.inOut' }, '-=0.12')
        .set(el, { autoAlpha: 0 })
    }
    return () => {
      tl.kill()
    }
  }, [open])

  return (
    <div ref={ref} id={id} style={{ overflow: 'hidden', ...style }}>
      <div ref={innerRef} style={innerStyle}>
        {children}
      </div>
    </div>
  )
}

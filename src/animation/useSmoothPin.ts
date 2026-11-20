import type { RefObject } from 'react'
import { gsap, ScrollTrigger, useGSAP } from './gsap'
import { useSmoother } from './SmoothScroll'

/** 고정 헤더 높이(--header-h, AppLayout이 측정) */
function headerHeight(): number {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64
}

interface Options {
  /** 고정 헤더 아래로 얼마나 띄워 고정할지(px) */
  offset: number
  /** 고정을 쓸 화면 조건 (예: 사이드바가 옆에 놓이는 폭) */
  media: string
}

/**
 * position: sticky 대체.
 * ScrollSmoother 안에서는 sticky가 동작하지 않으므로 ScrollTrigger pin으로 부모 영역 끝까지 고정한다.
 * 스무스 스크롤이 꺼져 있으면(동작 줄이기) 기존 sticky가 그대로 동작한다.
 */
export function useSmoothPin(ref: RefObject<HTMLElement>, { offset, media }: Options) {
  const smoother = useSmoother()
  useGSAP(
    () => {
      const el = ref.current
      if (!smoother || !el || !el.parentElement) return
      const parent = el.parentElement
      const mm = gsap.matchMedia()
      mm.add(media, () => {
        // CSS sticky의 top 오프셋이 pin 위치에 더해지지 않도록 잠시 끔 (mm.revert 때 복원)
        gsap.set(el, { position: 'relative', top: 0 })
        ScrollTrigger.create({
          trigger: el,
          start: () => `top top+=${headerHeight() + offset}`,
          endTrigger: parent,
          end: () => `bottom top+=${headerHeight() + offset + el.offsetHeight}`,
          pin: true,
          pinSpacing: false,
          invalidateOnRefresh: true,
        })
      })
      return () => mm.revert()
    },
    { dependencies: [smoother], revertOnUpdate: true },
  )
}

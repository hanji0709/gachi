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
 * position: sticky 대체 (ScrollSmoother 안에서는 sticky가 동작하지 않음).
 *
 * ScrollTrigger pin은 실제 스크롤 위치로, 본문은 부드럽게 따라붙는 위치로 움직여서
 * 둘 사이 차이만큼 카드가 떨려 보였다. 그래서 본문이 그려지는 같은 프레임(gsap.ticker)에서
 * 본문의 현재 이동값을 읽어 그만큼 카드를 거꾸로 옮겨, 화면에서는 멈춰 있게 한다.
 * 부모 영역 끝에 닿으면 더 내려가지 않는다. 스무스 스크롤이 꺼져 있으면 기존 sticky가 동작한다.
 */
export function useSmoothPin(ref: RefObject<HTMLElement>, { offset, media }: Options) {
  const smoother = useSmoother()
  useGSAP(
    () => {
      const el = ref.current
      if (!smoother || !el || !el.parentElement) return
      const parent = el.parentElement
      const content = smoother.content()
      const mm = gsap.matchMedia()
      mm.add(media, () => {
        gsap.set(el, { position: 'relative', top: 0, y: 0 })
        let shift = 0
        // 본문 안에서의 원래 위치 (카드 이동값 제외)
        let naturalTop = 0
        let maxShift = 0
        const measure = () => {
          const c = content.getBoundingClientRect()
          naturalTop = el.getBoundingClientRect().top - c.top - shift
          const parentBottom = parent.getBoundingClientRect().bottom - c.top
          maxShift = Math.max(0, parentBottom - naturalTop - el.offsetHeight)
        }
        const update = () => {
          // 본문 이동값(y)은 음수 = 그만큼 스크롤된 상태
          const scrolled = -(gsap.getProperty(content, 'y') as number)
          const next = Math.min(maxShift, Math.max(0, scrolled + headerHeight() + offset - naturalTop))
          if (Math.abs(next - shift) > 0.01) {
            shift = next
            gsap.set(el, { y: shift })
          }
        }
        measure()
        update()
        gsap.ticker.add(update)
        ScrollTrigger.addEventListener('refresh', measure)
        const ro = new ResizeObserver(() => {
          measure()
          update()
        })
        ro.observe(el)
        ro.observe(parent)
        return () => {
          gsap.ticker.remove(update)
          ScrollTrigger.removeEventListener('refresh', measure)
          ro.disconnect()
          gsap.set(el, { clearProps: 'position,top,transform' })
        }
      })
      return () => mm.revert()
    },
    { dependencies: [smoother], revertOnUpdate: true },
  )
}

import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { prefersReducedMotion, ScrollSmoother, ScrollTrigger } from './gsap'

const SmootherCtx = createContext<ScrollSmoother | null>(null)

/** 현재 ScrollSmoother 인스턴스 (동작 줄이기 설정이면 null → 기본 스크롤) */
export function useSmoother() {
  return useContext(SmootherCtx)
}

/**
 * ScrollSmoother 래퍼.
 * #smooth-wrapper 안의 내용은 transform으로 움직이므로,
 * 고정 요소(헤더·하단 탭·하단 바·모달)는 반드시 이 컴포넌트 밖에 두거나 <FixedLayer>로 렌더한다.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [smoother, setSmoother] = useState<ScrollSmoother | null>(null)

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const s = ScrollSmoother.create({
      wrapper: wrapperRef.current!,
      content: contentRef.current!,
      smooth: 1.1, // 스크롤이 따라붙는 시간(초)
      effects: true, // data-speed / data-lag 패럴랙스 사용
      smoothTouch: 0.1, // 터치 기기는 아주 약하게
      normalizeScroll: false,
    })
    setSmoother(s)
    // 웹폰트가 늦게 로드되면 높이가 달라지므로 다시 계산
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
    return () => {
      s.kill()
      setSmoother(null)
    }
  }, [])

  return (
    <SmootherCtx.Provider value={smoother}>
      <div id="smooth-wrapper" ref={wrapperRef}>
        <div id="smooth-content" ref={contentRef}>
          {children}
        </div>
      </div>
    </SmootherCtx.Provider>
  )
}

/** 스무스 스크롤 영역 밖(body)에 렌더 — position: fixed 요소용 */
export function FixedLayer({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}

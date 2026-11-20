import { useLayoutEffect, useRef, type RefObject } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Icon } from '../ui'

/**
 * 배우자가 아직 참여하지 않은 가구에 모든 화면 하단에 상시 띄우는 안내.
 * - 높이를 --solo-h로 내보내 본문 아래 여백을 늘림 (마지막 내용이 가려지지 않게)
 * - 월별 결산의 하단 확인 바가 있으면(--fixed-bar-h) 그 위에 뜸
 */
export function SoloNotice() {
  const { household, members } = useAuth()
  const show = Boolean(household) && members.length < 2
  const ref = useRef<HTMLDivElement>(null)
  useCssHeight(ref, '--solo-h', show)
  if (!show) return null
  return (
    <div ref={ref} className="solo-notice" role="note">
      <Icon name="info" size={18} strokeWidth={2} />
      <span className="solo-notice__pc">배우자가 참여하기 전까지는 혼자서도 결산을 마감할 수 있어요</span>
      {/* 모바일: 한 줄에 들어가게 짧게 */}
      <span className="solo-notice__m">배우자 참여 전엔 혼자서도 마감할 수 있어요</span>
    </div>
  )
}

/** 요소 높이를 문서 CSS 변수로 내보냄 (없어지면 0) */
export function useCssHeight(ref: RefObject<HTMLElement>, name: string, active = true) {
  useLayoutEffect(() => {
    const root = document.documentElement.style
    const el = ref.current
    if (!active || !el) {
      root.setProperty(name, '0px')
      return
    }
    const apply = () => root.setProperty(name, `${el.offsetHeight}px`)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.setProperty(name, '0px')
    }
  }, [ref, name, active])
}

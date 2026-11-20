import { useEffect, useState } from 'react'
import { gsap, prefersReducedMotion } from '../animation/gsap'
import { useAuth } from '../auth/AuthProvider'
import './splash.css'

/**
 * 첫 진입 스플래시 (새로고침·처음 열 때만, 메뉴 이동 때는 없음)
 * 보라 배경 위 새싹 로고: 그림자 실루엣 → 아래에서 위로 색이 차오름 → 다 차면 이파리 끝이 반짝 → 사라짐
 *
 * 스플래시가 덮고 있는 동안 화면 뒤의 GSAP 애니메이션(상단 숫자 슬롯, 그래프 채우기 등)이 미리 재생되지 않도록
 * 전역 타임라인을 멈춰 두었다가, 스플래시가 사라지기 시작할 때 이어서 재생한다.
 * 스플래시 자체는 CSS 애니메이션이라 이 정지의 영향을 받지 않는다.
 */

const LEAF = 'M32 36.2 C34.5 22 43 9 57 7 C57.5 22.5 48 34.6 32 36.2 Z'
const STEM = 'M29.8 56 C29.8 47 30.2 41.5 30.6 37.6 C24.5 37 12.5 31.5 9 17 C22 15.5 33 25 33.4 34.5 C33.7 41 34.2 47 34.2 56 C34.2 59 29.8 59 29.8 56 Z'
/** 네 갈래 반짝임 */
const SPARK = 'M12 0 C12.9 7.6 16.4 11.1 24 12 C16.4 12.9 12.9 16.4 12 24 C11.1 16.4 7.6 12.9 0 12 C7.6 11.1 11.1 7.6 12 0 Z'

const REDUCED = prefersReducedMotion()
/** 연출 시간: 채우기(0.2초 대기 + 1.4초) + 반짝임(0.7초) — splash.css와 맞춤 */
const INTRO_MS = REDUCED ? 400 : 2300
/** 사라지는 시간 — splash.css의 .is-exit 전환과 맞춤 */
const EXIT_MS = 500
/** 로그인 확인이 오래 걸려도 이 시간이 지나면 스플래시는 걷음 (뒤 화면에 로딩 표시가 있음) */
const MAX_WAIT_MS = 8000

// 모듈을 불러오는 시점(첫 화면을 그리기 전)에 앱 애니메이션을 멈춤
gsap.globalTimeline.pause()

type Phase = 'show' | 'exit' | 'gone'

export function Splash() {
  const { loading } = useAuth()
  const [introDone, setIntroDone] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [phase, setPhase] = useState<Phase>('show')

  useEffect(() => {
    const intro = window.setTimeout(() => setIntroDone(true), INTRO_MS)
    const max = window.setTimeout(() => setTimedOut(true), MAX_WAIT_MS)
    return () => {
      window.clearTimeout(intro)
      window.clearTimeout(max)
    }
  }, [])

  // 연출이 끝나고 로그인 확인도 끝나면 걷기 시작 → 뒤 화면 애니메이션 재생
  useEffect(() => {
    if (phase === 'show' && introDone && (!loading || timedOut)) {
      setPhase('exit')
      gsap.globalTimeline.resume()
    }
  }, [phase, introDone, loading, timedOut])

  useEffect(() => {
    if (phase !== 'exit') return
    const t = window.setTimeout(() => setPhase('gone'), EXIT_MS)
    return () => window.clearTimeout(t)
  }, [phase])

  if (phase === 'gone') return null

  return (
    <div
      className={`splash${phase === 'exit' ? ' is-exit' : ''}${REDUCED ? ' is-reduced' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="가치성장을 불러오는 중"
    >
      <div className="splash__mark" aria-hidden="true">
        {/* 그림자 실루엣 */}
        <svg className="splash__shadow" viewBox="0 0 64 64">
          <path d={LEAF} />
          <path d={STEM} />
        </svg>
        {/* 아래에서 위로 드러나는 컬러 로고 (보라 배경용: 줄기·왼쪽 잎 흰색, 오른쪽 잎 시안) */}
        <div className="splash__fill">
          <svg viewBox="0 0 64 64">
            <path d={LEAF} fill="#3CC8DC" />
            <path d={STEM} fill="#FFFFFF" />
          </svg>
        </div>
        {/* 이파리 끝 반짝임 */}
        <svg className="splash__spark" viewBox="0 0 24 24">
          <path d={SPARK} fill="#FFFFFF" />
        </svg>
        <svg className="splash__spark splash__spark--small" viewBox="0 0 24 24">
          <path d={SPARK} fill="#FFFFFF" />
        </svg>
      </div>
      <div className="splash__word" aria-hidden="true">
        가치성장
      </div>
      <p className="splash__tagline">부부가 함께 쓰는 자산관리 플랫폼</p>
    </div>
  )
}

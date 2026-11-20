import { useRef } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from './gsap'
import './animation.css'

/** 슬롯 숫자가 마지막 자릿수까지 멈추는 시간(초) — 홈의 막대 그래프도 이 시간에 맞춰 채워짐 */
export const SLOT_DURATION = 3
/** 슬롯 숫자 시작 지연(초) — 홈 막대도 같은 지연으로 함께 시작 */
export const SLOT_DELAY = 0.15
/** 홈 막대 그래프가 차오르는 시간(초): 슬롯 시간의 80% (3초는 느리게 느껴져 줄임 → 2.4초) */
export const BAR_FILL_DURATION = SLOT_DURATION * 0.8

interface SlotNumberProps {
  /** 포맷된 숫자 문자열 (예: "1,245,554,444") — 숫자가 아닌 글자(쉼표 등)는 고정 */
  value: string
  /** 전체 롤링 시간(초): 마지막 자릿수가 이 시점에 멈춤 */
  duration?: number
  /** 자릿수 사이 착지 간격(초) */
  stagger?: number
  /** 착지 순서: left = 왼쪽 자릿수부터 멈춤 */
  from?: 'left' | 'right'
  /** 시작 지연(초) */
  delay?: number
}

/**
 * 최고 속도(칸/초). 한 화면 프레임에 반 칸 넘게 움직이면 눈에는 숫자가
 * 아래로 가거나 뒤죽박죽 도는 것처럼 보이므로(마차 바퀴 효과) 이 아래로 제한한다.
 * 18칸/초 = 60fps 기준 프레임당 0.3칸.
 */
const MAX_SPEED = 18
/** 띠 한 줄의 칸 수 (최대 이동 칸 수보다 넉넉하게) */
const ROWS = 60

/** n칸 위치(띠 높이 대비 %) — 음수 = 위로 이동 */
const yPercentAt = (row: number) => (-row * 100) / ROWS

/**
 * 이 자릿수가 굴러갈 칸 수: 최종 숫자(digit)에서 끝나는 10의 배수 바퀴 중
 * 최고 속도 제한을 넘지 않는 가장 긴 거리.
 * sine.out의 시작 속도 = (π/2)·거리/시간 이므로 거리 ≤ MAX_SPEED·시간/(π/2)
 */
function travelRows(digit: number, duration: number): number {
  const maxRows = (MAX_SPEED * duration) / (Math.PI / 2)
  const cycles = Math.max(0, Math.floor((maxRows - digit) / 10))
  return Math.min(cycles * 10 + digit, ROWS - 1)
}

/** "사이트 접속 시" 1회만 재생: 한 번 끝까지 재생되면 이후 방문에선 최종 숫자로 바로 표시 */
let playedThisLoad = false

/**
 * 슬롯머신 숫자: 자릿수마다 0~9 띠를 위쪽으로 굴리다가
 * 0.1초 간격으로 차례로 감속(ease-out)하며 최종 숫자에 착지한다.
 */
export function SlotNumber({ value, duration = SLOT_DURATION, stagger = 0.1, from = 'left', delay = SLOT_DELAY }: SlotNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      const strips = gsap.utils.toArray<HTMLElement>('.slot__strip', ref.current)
      const n = strips.length

      // 착지 순서: 먼저 멈출 자릿수일수록 짧게 → 0.1초 간격으로 차례로, 마지막은 duration에 착지
      const plan = strips.map((strip, i) => {
        const order = from === 'left' ? i : n - 1 - i
        const d = duration - (n - 1 - order) * stagger
        return { strip, d, rows: travelRows(Number(strip.dataset.digit), d) }
      })

      if (playedThisLoad || prefersReducedMotion()) {
        plan.forEach(({ strip, rows }) => gsap.set(strip, { yPercent: yPercentAt(rows) }))
        return
      }

      const tl = gsap.timeline({ delay, onComplete: () => (playedThisLoad = true) })
      plan.forEach(({ strip, d, rows }) => {
        // 항상 위쪽(yPercent 감소)으로만 이동, 끝에서 부드럽게 감속
        tl.fromTo(strip, { yPercent: 0 }, { yPercent: yPercentAt(rows), duration: d, ease: 'sine.out' }, 0)
      })
    },
    { scope: ref, dependencies: [value] },
  )

  return (
    <span ref={ref} className="slot">
      <span className="sr-only">{value}</span>
      {value.split('').map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} className="slot__window" aria-hidden="true">
            <span className="slot__strip" data-digit={ch}>
              {Array.from({ length: ROWS }, (_, r) => (
                <span key={r} className="slot__digit">
                  {r % 10}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} aria-hidden="true">
            {ch}
          </span>
        ),
      )}
    </span>
  )
}

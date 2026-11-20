import type { CSSProperties, ReactNode } from 'react'

export interface Segment {
  value: number
  color: string
}

/**
 * 그래프 등장 애니메이션 표시.
 * animate를 켜면 화면에 들어올 때 채워지는 애니메이션이 붙는다(src/animation/useScrollEffects.ts가 처리).
 * - true: 기본 시간
 * - 숫자(초): 그 시간 동안 채워짐 (예: 홈 상단 슬롯 숫자와 맞추기)
 */
type Reveal = 'bar' | 'donut' | 'line'
export type RevealOption = boolean | number
const revealAttr = (on: RevealOption | undefined, kind: Reveal) =>
  on
    ? {
        'data-chart-reveal': kind,
        ...(typeof on === 'number' ? { 'data-chart-duration': on } : {}),
      }
    : {}

/** 가로 누적 막대 (자산·부채 구성) — animate: 왼쪽→오른쪽으로 채워짐 */
export function StackBar({
  segments,
  height = 16,
  animate,
  style,
}: {
  segments: Segment[]
  height?: number
  animate?: RevealOption
  style?: CSSProperties
}) {
  return (
    <div className="stack-bar" {...revealAttr(animate, 'bar')} style={{ height, ...style }}>
      {segments
        .filter((s) => s.value > 0)
        .map((s, i) => (
          <div key={i} style={{ flex: s.value, background: s.color }} />
        ))}
    </div>
  )
}

interface ProgressBarProps {
  /** 0~100 */
  pct: number
  color?: string
  height?: number
  /** 예산 초과분(빨강으로 이어 붙임), 0~100 */
  overPct?: number
  track?: string
  /** 화면에 들어올 때 왼쪽→오른쪽으로 채워짐 (트랙은 그대로). 숫자면 그 시간(초) 동안 */
  animate?: RevealOption
  style?: CSSProperties
}

/** 비율 막대 / 예산 대비 사용 막대 */
export function ProgressBar({ pct, color = 'var(--violet-700)', height = 12, overPct, track, animate, style }: ProgressBarProps) {
  return (
    <div className="progress" style={{ height, background: track, ...style }}>
      {/* 채움 부분(사용분 + 초과분)을 한 묶음으로 두어 함께 왼쪽부터 드러나게 함 */}
      <div className="progress__fills" {...revealAttr(animate, 'bar')}>
        <div
          className="progress__fill"
          style={{ width: `${pct}%`, background: color, borderRadius: overPct ? 0 : undefined }}
        />
        {overPct ? <div style={{ width: `${overPct}%`, height: '100%', background: 'var(--bad)' }} /> : null}
      </div>
    </div>
  )
}

export interface LegendItem {
  color: string
  label: ReactNode
  pct?: ReactNode
  amount?: ReactNode
}

/** PC 범례: 색 · 이름 · 비중 · 금액 */
export function Legend({ items, style }: { items: LegendItem[]; style?: CSSProperties }) {
  return (
    <div className="legend" style={style}>
      {items.map((it, i) => (
        <div key={i} className="legend__row">
          <span className="legend__swatch" style={{ background: it.color }} />
          <span className="legend__label">{it.label}</span>
          {it.pct !== undefined && <span className="legend__pct">{it.pct}</span>}
          {it.amount !== undefined && <span className="legend__amount">{it.amount}</span>}
        </div>
      ))}
    </div>
  )
}

/** 모바일 2열 범례: 색 · 이름 · 굵은 비중 */
export function LegendGrid({ items, columns = 2, size = 13, style }: { items: LegendItem[]; columns?: number; size?: number; style?: CSSProperties }) {
  return (
    <div className="legend-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`, ...style }}>
      {items.map((it, i) => (
        <span key={i} className="legend-grid__item" style={{ fontSize: size }}>
          <span className="legend__swatch" style={{ background: it.color }} />
          {it.label}
          <b>{it.pct}</b>
        </span>
      ))}
    </div>
  )
}

interface DonutProps {
  /** 비중(%) 순서대로, 합계 100 */
  segments: { pct: number; color: string }[]
  size?: number
  hole?: number
  children?: ReactNode
  label?: string
  /** 화면에 들어올 때 12시 방향부터 시계 방향으로 채워짐 */
  animate?: boolean
}

/**
 * 도넛 차트 (conic-gradient)
 * 색 고리(.donut__ring)를 conic 마스크로 가려 두고 --p(0→1)로 시계 방향으로 드러낸다.
 * 고리 아래 회색 트랙이 보이고, 가운데 구멍·글자는 마스크 영향 없이 항상 보인다.
 */
export function Donut({ segments, size = 200, hole = 120, children, label = '구성 비중 도넛 차트', animate }: DonutProps) {
  let acc = 0
  const stops = segments
    .map((s) => {
      const from = acc
      acc += s.pct
      return `${s.color} ${from.toFixed(2)}% ${acc.toFixed(2)}%`
    })
    .join(', ')
  return (
    <div role="img" aria-label={label} className="donut" {...revealAttr(animate, 'donut')} style={{ width: size, height: size }}>
      <div className="donut__ring" style={{ background: `conic-gradient(${stops})` }} />
      <div className="donut__hole" style={{ width: hole, height: hole }}>
        {children}
      </div>
    </div>
  )
}

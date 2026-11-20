import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'

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
  /**
   * 조각별 상세 내용 (segments와 같은 순서). 주면 레이어 팝업이 붙는다.
   * - PC: 마우스를 올린 조각 / 모바일: 터치한 조각 (다시 누르거나 바깥을 누르면 닫힘)
   * - 키보드: Tab → ←/→로 조각 이동, Esc로 닫기
   */
  tips?: ReactNode[]
}

/**
 * 도넛 차트 (conic-gradient)
 * 색 고리(.donut__ring)를 conic 마스크로 가려 두고 --p(0→1)로 시계 방향으로 드러낸다.
 * 고리 아래 회색 트랙이 보이고, 가운데 구멍·글자는 마스크 영향 없이 항상 보인다.
 */
export function Donut({ segments, size = 200, hole = 120, children, label = '구성 비중 도넛 차트', animate, tips }: DonutProps) {
  const [active, setActive] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  let acc = 0
  const ranges = segments.map((s) => {
    const from = acc
    acc += s.pct
    return { from, to: acc }
  })
  const stops = segments.map((s, i) => `${s.color} ${ranges[i].from.toFixed(2)}% ${ranges[i].to.toFixed(2)}%`).join(', ')
  /** 팝업을 열 수 있는 조각 (비중 0은 건너뜀) */
  const visible = segments.map((s, i) => (s.pct > 0 ? i : -1)).filter((i) => i >= 0)
  const hoverable = !!tips && visible.length > 0

  // 터치로 연 팝업: 도넛 바깥을 누르면 닫기
  useEffect(() => {
    if (active === null) return
    const onDown = (e: globalThis.PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setActive(null)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [active])

  /** 포인터 위치 → 조각 번호 (고리 밖·구멍 안이면 null) */
  const pick = (e: PointerEvent): number | null => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return null
    const scale = r.width / size
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    const dist = Math.hypot(dx, dy) / scale
    if (dist < hole / 2 || dist > size / 2) return null
    // 12시 방향 0%, 시계 방향으로 증가
    const pct = (((Math.atan2(dx, -dy) / (2 * Math.PI)) % 1) + 1) % 1 * 100
    const i = ranges.findIndex((g, k) => segments[k].pct > 0 && pct >= g.from && pct < g.to)
    return i < 0 ? null : i
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const step = e.key === 'ArrowRight' ? 1 : -1
      setActive((cur) => {
        const pos = cur === null ? (step > 0 ? -1 : visible.length) : visible.indexOf(cur)
        return visible[(pos + step + visible.length) % visible.length]
      })
    }
    if (e.key === 'Escape') setActive(null)
  }

  // 선택한 조각만 또렷하게: 나머지 조각 위에 반투명 막을 덮음
  const dim = 'color-mix(in srgb, var(--surface) 62%, transparent)'
  const focus = active === null ? null : ranges[active]
  // 팝업 위치: 조각 가운데 각도의 고리 중앙
  const mid = focus ? (((focus.from + focus.to) / 2) / 100) * 2 * Math.PI : 0
  const rMid = (size / 2 + hole / 2) / 2
  const tipX = size / 2 + Math.sin(mid) * rMid
  const tipY = size / 2 - Math.cos(mid) * rMid
  const xRatio = tipX / size
  const shiftX = xRatio < 0.35 ? '-22%' : xRatio > 0.65 ? '-78%' : '-50%'
  const below = tipY < size * 0.4

  return (
    <div
      ref={ref}
      role={hoverable ? 'group' : 'img'}
      aria-label={hoverable ? `${label} · 좌우 화살표로 조각별 상세 보기` : label}
      className={hoverable ? 'donut donut--hover' : 'donut'}
      {...revealAttr(animate, 'donut')}
      style={{ width: size, height: size }}
      {...(hoverable
        ? {
            tabIndex: 0,
            onKeyDown,
            onPointerMove: (e: PointerEvent) => e.pointerType === 'mouse' && setActive(pick(e)),
            onPointerLeave: (e: PointerEvent) => e.pointerType === 'mouse' && setActive(null),
            onPointerDown: (e: PointerEvent) => {
              if (e.pointerType === 'mouse') return
              const i = pick(e)
              setActive((cur) => (i === null || cur === i ? null : i))
            },
            onBlur: () => setActive(null),
          }
        : {})}
    >
      <div className="donut__ring" style={{ background: `conic-gradient(${stops})` }} />
      {focus && (
        <div
          className="donut__dim"
          aria-hidden
          style={{ background: `conic-gradient(${dim} 0% ${focus.from.toFixed(2)}%, transparent ${focus.from.toFixed(2)}% ${focus.to.toFixed(2)}%, ${dim} ${focus.to.toFixed(2)}% 100%)` }}
        />
      )}
      <div className="donut__hole" style={{ width: hole, height: hole }}>
        {children}
      </div>
      {active !== null && tips && (
        <div
          role="status"
          aria-live="polite"
          className="chart-tip"
          style={{ left: tipX, top: tipY, transform: `translate(${shiftX}, ${below ? '14px' : 'calc(-100% - 14px)'})` }}
        >
          {tips[active]}
        </div>
      )}
    </div>
  )
}

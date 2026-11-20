import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'

export interface HoverPoint {
  /** 데이터 지점 x (SVG viewBox 좌표) */
  x: number
  /** 팝업을 붙일 높이 (없으면 그래프 위쪽) */
  y?: number
}

interface ChartHoverProps {
  /** SVG viewBox 크기 */
  width: number
  height: number
  /** 가이드 선이 그어질 그래프 영역 위·아래 */
  plotTop: number
  plotBottom: number
  /** 데이터 지점 (x 오름차순) */
  points: HoverPoint[]
  /** SVG 설명 (화면 낭독기) */
  label: string
  /** i번째 지점의 상세 내용 (레이어 팝업) */
  renderTooltip: (i: number) => ReactNode
  /** i번째 지점이 선택됐을 때 SVG 위에 그릴 강조 표시 (점·막대 테두리 등) */
  renderMarker?: (i: number) => ReactNode
  /** SVG 속성 (예: data-chart-reveal) */
  svgProps?: Record<string, string>
  children: ReactNode
}

/**
 * 그래프 상세 보기 레이어 팝업
 * - PC: 마우스를 올린 열(가장 가까운 지점)의 상세가 팝업으로
 * - 모바일: 터치한 열의 상세, 같은 열을 다시 누르거나 바깥을 누르면 닫힘
 * - 키보드: 그래프에 Tab → ←/→로 지점 이동, Esc로 닫기 (내용은 화면 낭독기가 읽음)
 */
export function ChartHover({ width, height, plotTop, plotBottom, points, label, renderTooltip, renderMarker, svgProps, children }: ChartHoverProps) {
  const [active, setActive] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const tipId = useId()

  // 각 지점의 감지 영역: 이웃 지점과의 가운데까지
  const bands = points.map((p, i) => {
    const left = i === 0 ? Math.max(0, p.x - (points[1] ? (points[1].x - p.x) / 2 : 20)) : (points[i - 1].x + p.x) / 2
    const right =
      i === points.length - 1 ? Math.min(width, p.x + (i > 0 ? (p.x - points[i - 1].x) / 2 : 20)) : (p.x + points[i + 1].x) / 2
    return { left, right }
  })

  // 터치로 연 팝업: 그래프 바깥을 누르면 닫기
  useEffect(() => {
    if (active === null) return
    const onDown = (e: globalThis.PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setActive(null)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [active])

  const onBandEnter = (i: number) => (e: PointerEvent) => {
    if (e.pointerType === 'mouse') setActive(i)
  }
  const onBandDown = (i: number) => (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') setActive((cur) => (cur === i ? null : i))
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const step = e.key === 'ArrowRight' ? 1 : -1
      setActive((cur) => (cur === null ? (step > 0 ? 0 : points.length - 1) : Math.min(points.length - 1, Math.max(0, cur + step))))
    }
    if (e.key === 'Escape') setActive(null)
  }

  const p = active === null ? null : points[active]
  const xRatio = p ? p.x / width : 0
  const anchorY = p ? (p.y ?? plotTop) : 0
  // 위쪽에 공간이 없으면 지점 아래로, 좌우 끝에서는 안쪽으로 붙임
  const below = anchorY / height < 0.3
  const shiftX = xRatio < 0.18 ? '-12%' : xRatio > 0.82 ? '-88%' : '-50%'

  return (
    <div
      ref={wrapRef}
      className="chart-hover"
      tabIndex={0}
      role="group"
      aria-label={`${label} · 좌우 화살표로 지점별 상세 보기`}
      aria-describedby={active !== null ? tipId : undefined}
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActive(null)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') setActive(null)
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={label} style={{ display: 'block' }} {...svgProps}>
        {children}
        {p && (
          <g pointerEvents="none">
            <line x1={p.x} x2={p.x} y1={plotTop} y2={plotBottom} stroke="var(--text-sub)" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
            {renderMarker?.(active!)}
          </g>
        )}
        {bands.map((b, i) => (
          <rect
            key={i}
            x={b.left}
            y={plotTop}
            width={Math.max(0, b.right - b.left)}
            height={plotBottom - plotTop}
            fill="transparent"
            style={{ cursor: 'crosshair' }}
            onPointerEnter={onBandEnter(i)}
            onPointerMove={onBandEnter(i)}
            onPointerDown={onBandDown(i)}
          />
        ))}
      </svg>
      {p && (
        <div
          id={tipId}
          role="status"
          aria-live="polite"
          className="chart-tip"
          style={{
            left: `${xRatio * 100}%`,
            top: `${(anchorY / height) * 100}%`,
            transform: `translate(${shiftX}, ${below ? '14px' : 'calc(-100% - 14px)'})`,
          }}
        >
          {renderTooltip(active!)}
        </div>
      )}
    </div>
  )
}

/* ───────── 팝업 안 내용 조각 ───────── */
export function TipTitle({ children }: { children: ReactNode }) {
  return <div className="chart-tip__title">{children}</div>
}

export function TipRow({ color, line, label, value, strong }: { color?: string; line?: boolean; label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div className={`chart-tip__row${strong ? ' is-strong' : ''}`}>
      {color && <span className={line ? 'chart-tip__line' : 'chart-tip__swatch'} style={{ background: color }} />}
      <span className="chart-tip__label">{label}</span>
      <span className="chart-tip__value">{value}</span>
    </div>
  )
}

/* ───────── 좌표 ↔ 값 도우미 ─────────
 * 아직 실데이터가 연결되지 않은 그래프는 디자인 좌표만 있으므로,
 * 축 눈금 두 개로 y좌표를 금액으로 되돌려 팝업에 보여 준다. */

/** 두 눈금 (y0→v0, y1→v1)으로 y좌표 → 값 */
export function linearScale(y0: number, v0: number, y1: number, v1: number) {
  return (y: number) => v0 + ((y - y0) * (v1 - v0)) / (y1 - y0)
}

/** 축 라벨 → 원: "1,200만" → 12,000,000 · "21억" → 2,100,000,000 · "-10억" */
export function parseAxisLabel(label: string): number {
  const m = label.replace(/,/g, '').match(/^([−-]?)([\d.]+)(억|만)?$/)
  if (!m) return NaN
  const unit = m[3] === '억' ? 1e8 : m[3] === '만' ? 1e4 : 1
  return (m[1] ? -1 : 1) * Number(m[2]) * unit
}

/** "x,y x,y …" 또는 "Mx,y Lx,y …" → [[x, y], …] */
export function parsePoints(s: string): [number, number][] {
  return (s.match(/-?[\d.]+,-?[\d.]+/g) ?? []).map((p) => p.split(',').map(Number) as [number, number])
}

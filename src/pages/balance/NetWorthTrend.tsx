import { useId, type ReactNode } from 'react'
import { formatShort, splitMonth } from '../../data/format'

/**
 * 순자산 추이 선 그래프 — 결산월별 순자산으로 축·좌표를 계산 (디자인 시안의 크기·색 기준)
 * PC: viewBox 1100×240 / 모바일: 360×180
 */

export interface TrendPoint {
  month: string // "2026-10"
  value: number
}

interface Layout {
  w: number
  h: number
  left: number
  right: number
  top: number
  bottom: number
  labelX: number
  axisY: number
  /** x축 라벨 */
  label: (month: string) => string
}

const PC: Layout = { w: 1100, h: 240, left: 56, right: 1084, top: 16, bottom: 208, labelX: 48, axisY: 230, label: (m) => m.slice(2) }
const M: Layout = { w: 360, h: 180, left: 44, right: 344, top: 16, bottom: 148, labelX: 36, axisY: 170, label: (m) => `${String(splitMonth(m).month).padStart(2, '0')}월` }

/** 축 눈금 라벨: 1억 이상은 소수 첫째 자리 억 */
const tickLabel = (v: number) => (Math.abs(v) >= 1e8 ? `${(v / 1e8).toFixed(1)}억` : formatShort(v))

/**
 * 데이터(면적·선·끝점)만 감싸는 클립 그룹.
 * 화면에 들어오면 클립 사각형의 width가 0 → full로 늘어나며 왼쪽→오른쪽으로 채워진다
 * (src/animation/useScrollEffects.ts의 data-chart-reveal="line" 처리). 축·라벨은 항상 보임.
 */
function RevealGroup({ x, width, height, children }: { x: number; width: number; height: number; children: ReactNode }) {
  const id = `trend-clip-${useId().replace(/:/g, '')}`
  return (
    <>
      <defs>
        <clipPath id={id}>
          <rect data-reveal-rect data-full-width={width} x={x} y={0} width={width} height={height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>{children}</g>
    </>
  )
}

function Trend({ points, layout: L }: { points: TrendPoint[]; layout: Layout }) {
  if (points.length === 0) {
    return (
      <p className="caption" style={{ padding: '32px 0', textAlign: 'center' }}>
        결산을 입력하면 순자산 추이가 그려져요.
      </p>
    )
  }
  const values = points.map((p) => p.value)
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  // 값이 하나뿐이거나 변화가 없으면 위아래로 여유를 둠
  const pad = hi === lo ? Math.max(Math.abs(hi) * 0.05, 1e6) : (hi - lo) * 0.1
  lo -= pad
  hi += pad
  const yOf = (v: number) => L.bottom - ((v - lo) / (hi - lo)) * (L.bottom - L.top)
  const xOf = (i: number) => (points.length === 1 ? (L.left + L.right) / 2 : L.left + (i / (points.length - 1)) * (L.right - L.left))
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3)
  const coords = points.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.value).toFixed(1)}`)
  const last = points.length - 1
  // x축 라벨: 최대 6개, 끝 달은 항상
  const step = Math.max(1, Math.ceil(points.length / 6))
  const labelIdx = points.map((_, i) => i).filter((i) => (last - i) % step === 0)

  return (
    <svg viewBox={`0 0 ${L.w} ${L.h}`} width="100%" role="img" aria-label={`순자산 추이 그래프, ${points[0].month}부터 ${points[last].month}까지`} data-chart-reveal="line" style={{ display: 'block' }}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L.left} x2={L.right} y1={yOf(v)} y2={yOf(v)} style={{ stroke: 'var(--line)' }} />
          <text x={L.labelX} y={yOf(v) + 4} textAnchor="end" fontSize="11" style={{ fill: 'var(--text-sub)' }}>
            {tickLabel(v)}
          </text>
        </g>
      ))}
      <RevealGroup x={L.left - 6} width={L.w - L.left + 6} height={L.bottom + 7}>
        {points.length > 1 && (
          <>
            <path
              d={`M${xOf(0).toFixed(1)},${L.bottom} L${coords.join(' L')} L${xOf(last).toFixed(1)},${L.bottom} Z`}
              fillOpacity="0.10"
              style={{ fill: 'var(--violet-700)' }}
            />
            <polyline points={coords.join(' ')} fill="none" strokeWidth="2.5" strokeLinejoin="round" style={{ stroke: 'var(--violet-700)' }} />
          </>
        )}
        <circle cx={xOf(last)} cy={yOf(points[last].value)} r="5" stroke="#FFFFFF" strokeWidth="2" style={{ fill: 'var(--violet-700)' }} />
      </RevealGroup>
      {labelIdx.map((i) => (
        <text key={points[i].month} x={xOf(i)} y={L.axisY} textAnchor="middle" fontSize="11" style={{ fill: 'var(--text-sub)' }}>
          {L.label(points[i].month)}
        </text>
      ))}
    </svg>
  )
}

export const NetWorthTrendPc = ({ points }: { points: TrendPoint[] }) => <Trend points={points} layout={PC} />
export const NetWorthTrendM = ({ points }: { points: TrendPoint[] }) => <Trend points={points} layout={M} />

import { ChartHover, TipRow, TipTitle } from '../../components/ui'
import { formatShort, splitMonth } from '../../data/format'
import type { NwPoint, YearPoint } from './fireModel'

const EOK = 1e8
const eok = (n: number) => `${Math.round(n / EOK)}억`

/* ───────── 월별 순자산 추이: 자산은 0억 위로 쌓고 부채는 아래로, 순자산은 선 ───────── */
export const NW_LEGEND = [
  { label: '부동산', color: 'var(--chart-1)' },
  { label: '금융투자', color: 'var(--chart-2)' },
  { label: '예적금', color: 'var(--chart-3)' },
  { label: '기타', color: 'var(--chart-4)' },
  { label: '부채', color: 'var(--line-strong)' },
]

/** Y축 위쪽 고정: 45억 */
const NW_TOP = 45 * EOK
const NW_STEP = 15 * EOK

export function NetWorthChart({ series, width, height }: { series: NwPoint[]; width: number; height: number }) {
  if (series.length === 0) return <p className="caption" style={{ padding: '32px 0', textAlign: 'center' }}>입력된 결산이 없어요.</p>
  const m = width < 600
  const left = m ? 36 : 56
  const right = width - (m ? 8 : 16)
  const top = 10
  const bottom = height - 26
  const maxDebt = Math.max(0, ...series.map((p) => p.debt))
  const lo = -Math.max(NW_STEP, Math.ceil(maxDebt / NW_STEP) * NW_STEP)
  const y = (v: number) => top + ((NW_TOP - Math.min(v, NW_TOP)) / (NW_TOP - lo)) * (bottom - top)
  const zeroY = y(0)
  const ticks: number[] = []
  for (let v = lo; v <= NW_TOP; v += NW_STEP) ticks.push(v)

  const slot = (right - left) / series.length
  const barW = Math.max(3, Math.min(52, slot * 0.62))
  const xs = series.map((_, i) => left + slot * (i + 0.5))
  const labelEvery = Math.ceil(series.length / Math.max(1, Math.floor((right - left) / (m ? 52 : 80))))
  const label = (mo: string) => {
    const { year, month } = splitMonth(mo)
    return m ? `${month}월` : `${String(year).slice(2)}-${String(month).padStart(2, '0')}`
  }
  const stack = (p: NwPoint) => {
    let acc = 0
    return (
      [
        ['estate', 'var(--chart-1)'],
        ['fin', 'var(--chart-2)'],
        ['dep', 'var(--chart-3)'],
        ['etc', 'var(--chart-4)'],
      ] as const
    ).map(([k, color]) => {
      const v = p[k]
      const seg = { from: acc, to: acc + v, color, k }
      acc += v
      return seg
    })
  }

  return (
    <ChartHover
      width={width}
      height={height}
      plotTop={top}
      plotBottom={bottom}
      label="월별 순자산 추이"
      points={series.map((p, i) => ({ x: xs[i], y: y(p.estate + p.fin + p.dep + p.etc) }))}
      renderMarker={(i) => {
        const p = series[i]
        const topY = y(p.estate + p.fin + p.dep + p.etc)
        return (
          <>
            <rect x={xs[i] - barW / 2 - 2} y={topY - 2} width={barW + 4} height={y(-p.debt) - topY + 4} rx={4} fill="none" stroke="var(--violet-900)" strokeWidth={1.5} />
            <circle cx={xs[i]} cy={y(p.net)} r={6} stroke="#FFFFFF" strokeWidth={2} style={{ fill: 'var(--text)' }} />
          </>
        )
      }}
      renderTooltip={(i) => {
        const p = series[i]
        const { year, month } = splitMonth(p.month)
        return (
          <>
            <TipTitle>
              {year}년 {month}월
            </TipTitle>
            <TipRow color="var(--chart-1)" label="부동산" value={`${formatShort(p.estate)}원`} />
            <TipRow color="var(--chart-2)" label="금융투자" value={`${formatShort(p.fin)}원`} />
            <TipRow color="var(--chart-3)" label="예적금" value={`${formatShort(p.dep)}원`} />
            <TipRow color="var(--chart-4)" label="기타" value={`${formatShort(p.etc)}원`} />
            <TipRow color="var(--line-strong)" label="부채" value={`−${formatShort(p.debt)}원`} />
            <TipRow color="var(--text)" line label="순자산" value={`${formatShort(p.net)}원`} strong />
          </>
        )
      }}
    >
      {ticks.map((v) => (
        <g key={v}>
          <line x1={left} x2={right} y1={y(v)} y2={y(v)} style={{ stroke: v === 0 ? 'var(--line-strong)' : 'var(--line)' }} />
          <text x={left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} style={{ fill: 'var(--text-sub)' }}>
            {eok(v)}
          </text>
        </g>
      ))}
      {series.map((p, i) => (
        <g key={p.month}>
          {stack(p).map((s) => (
            <rect key={s.k} x={xs[i] - barW / 2} y={y(s.to)} width={barW} height={Math.max(0, y(s.from) - y(s.to))} style={{ fill: s.color }} />
          ))}
          <rect x={xs[i] - barW / 2} y={zeroY} width={barW} height={Math.max(0, y(-p.debt) - zeroY)} style={{ fill: 'var(--line-strong)' }} />
          {i % labelEvery === 0 && (
            <text x={xs[i]} y={height - 6} textAnchor="middle" fontSize={11} style={{ fill: 'var(--text-sub)' }}>
              {label(p.month)}
            </text>
          )}
        </g>
      ))}
      <polyline points={series.map((p, i) => `${xs[i]},${y(p.net)}`).join(' ')} fill="none" strokeWidth={2.5} style={{ stroke: 'var(--text)' }} />
      {series.map((p, i) => (
        <circle key={p.month} cx={xs[i]} cy={y(p.net)} r={3.5} style={{ fill: 'var(--text)' }} />
      ))}
    </ChartHover>
  )
}

/* ───────── 미래 자산 차트 ───────── */
export type ForecastView = '투자 가능 자산' | '순자산'
export type ForecastBasis = '명목' | '실질'

interface ForecastProps {
  base: YearPoint[]
  low: YearPoint[]
  high: YearPoint[]
  view: ForecastView
  basis: ForecastBasis
  reach: number | null
  width: number
  height: number
}

function niceStep(max: number, ticks: number): number {
  const raw = max / ticks
  const pow = 10 ** Math.floor(Math.log10(raw))
  const f = raw / pow
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow
}

export function ForecastChart({ base, low, high, view, basis, reach, width, height }: ForecastProps) {
  if (base.length === 0) return <p className="caption" style={{ padding: '32px 0', textAlign: 'center' }}>예측에 쓸 결산이 없어요.</p>
  const m = width < 600
  const val = (p: YearPoint) => (view === '순자산' ? p.net : p.inv) * (basis === '실질' ? p.deflator : 1)
  const tgt = (p: YearPoint) => p.target * (basis === '실질' ? p.deflator : 1)
  const showTarget = view === '투자 가능 자산'
  const left = m ? 40 : 56
  const right = width - (m ? 10 : 20)
  const top = 12
  const bottom = height - 30
  const all = [...base, ...low, ...high].map(val).concat(showTarget ? base.map(tgt) : [])
  const hiRaw = Math.max(1, ...all)
  const loRaw = Math.min(0, ...all)
  const step = niceStep(hiRaw - loRaw, 4)
  const hi = Math.ceil(hiRaw / step) * step
  const lo = Math.floor(loRaw / step) * step
  const y = (v: number) => top + ((hi - v) / (hi - lo)) * (bottom - top)
  const x = (i: number) => left + (base.length > 1 ? (i / (base.length - 1)) * (right - left) : 0)
  const ticks: number[] = []
  for (let v = lo; v <= hi + 1; v += step) ticks.push(v)
  const pts = (arr: YearPoint[], f: (p: YearPoint) => number) => arr.map((p, i) => `${x(i).toFixed(1)},${y(f(p)).toFixed(1)}`)
  const band = `M${pts(high, val).join(' L')} L${pts(low, val).reverse().join(' L')} Z`
  const yearEvery = Math.ceil((base.length - 1) / (m ? 4 : 6)) || 1
  const reachIdx = reach === null ? -1 : base.findIndex((p) => p.year === reach)

  return (
    <ChartHover
      width={width}
      height={height}
      plotTop={top}
      plotBottom={bottom}
      label={`${view} 예측${showTarget ? '과 목표 자산선' : ''}`}
      points={base.map((p, i) => ({ x: x(i), y: y(Math.max(val(high[i]), showTarget ? tgt(p) : 0)) }))}
      renderMarker={(i) => (
        <>
          <circle cx={x(i)} cy={y(val(high[i]))} r={4} stroke="#fff" strokeWidth={1.5} style={{ fill: 'var(--violet-300)' }} />
          <circle cx={x(i)} cy={y(val(low[i]))} r={4} stroke="#fff" strokeWidth={1.5} style={{ fill: 'var(--violet-300)' }} />
          {showTarget && <circle cx={x(i)} cy={y(tgt(base[i]))} r={5} stroke="#fff" strokeWidth={2} style={{ fill: 'var(--warn-fill)' }} />}
          <circle cx={x(i)} cy={y(val(base[i]))} r={6} stroke="#fff" strokeWidth={2} style={{ fill: 'var(--violet-700)' }} />
        </>
      )}
      renderTooltip={(i) => {
        const p = base[i]
        const gap = tgt(p) - val(p)
        return (
          <>
            <TipTitle>
              {p.year}년{i > 0 ? ` · ${i}년 후` : ' · 올해'}
            </TipTitle>
            <TipRow color="var(--violet-300)" label="낙관" value={`${formatShort(val(high[i]))}원`} />
            <TipRow color="var(--violet-700)" line label="내 가정" value={`${formatShort(val(p))}원`} />
            <TipRow color="var(--violet-300)" label="보수" value={`${formatShort(val(low[i]))}원`} />
            {showTarget && (
              <>
                <TipRow color="var(--warn-fill)" line label="목표 자산" value={`${formatShort(tgt(p))}원`} />
                <TipRow
                  label="내 가정 기준"
                  value={gap <= 0 ? <span style={{ color: 'var(--good)' }}>목표 달성</span> : <span style={{ color: 'var(--warn)' }}>{formatShort(gap)}원 부족</span>}
                  strong
                />
              </>
            )}
          </>
        )
      }}
    >
      {ticks.map((v) => (
        <g key={v}>
          <line x1={left} x2={right} y1={y(v)} y2={y(v)} style={{ stroke: v === 0 ? 'var(--line-strong)' : 'var(--line)' }} />
          <text x={left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} style={{ fill: 'var(--text-sub)' }}>
            {formatShort(v)}
          </text>
        </g>
      ))}
      <path d={band} fillOpacity={0.1} style={{ fill: 'var(--violet-700)' }} />
      {showTarget && <polyline points={pts(base, tgt).join(' ')} fill="none" strokeWidth={2} strokeDasharray="6 4" style={{ stroke: 'var(--warn-fill)' }} />}
      <polyline points={pts(base, val).join(' ')} fill="none" strokeWidth={2.5} style={{ stroke: 'var(--violet-700)' }} />
      {showTarget && reachIdx > 0 && (
        <g>
          <line x1={x(reachIdx)} x2={x(reachIdx)} y1={y(val(base[reachIdx]))} y2={bottom} strokeDasharray="3 3" style={{ stroke: 'var(--violet-700)' }} />
          <circle cx={x(reachIdx)} cy={y(val(base[reachIdx]))} r={6} stroke="#fff" strokeWidth={2} style={{ fill: 'var(--violet-700)' }} />
          <rect x={x(reachIdx) - 46} y={y(val(base[reachIdx])) - 36} width={92} height={24} rx={12} style={{ fill: 'var(--violet-700)' }} />
          <text x={x(reachIdx)} y={y(val(base[reachIdx])) - 19.5} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">
            {reach}년 도달
          </text>
        </g>
      )}
      {base.map((p, i) =>
        i % yearEvery === 0 || i === base.length - 1 ? (
          <text key={p.year} x={x(i)} y={height - 8} textAnchor="middle" fontSize={11} style={{ fill: 'var(--text-sub)' }}>
            {p.year}
          </text>
        ) : null,
      )}
    </ChartHover>
  )
}

import { ChartHover, TipRow, TipTitle } from '../../components/ui'
import { SAFETY_BALANCE, type Projection } from '../../data/cash'
import { formatShort, formatWon } from '../../data/format'

/** 예상 잔액 추이: 날짜별 계단선 + 안전 잔액 점선. 점에 올리면 그날 입출금 */
export function BalanceChart({ proj, width, height }: { proj: Projection; width: number; height: number }) {
  const m = width < 600
  const left = m ? 40 : 60
  const right = width - (m ? 10 : 20)
  const top = 14
  const bottom = height - 26
  // 날짜별 마지막 잔액
  const days = new Map<number, { balance: number; items: Projection['events'] }>()
  for (const e of proj.events) {
    const d = days.get(e.day) ?? { balance: 0, items: [] }
    d.balance = e.balance
    d.items.push(e)
    days.set(e.day, d)
  }
  const points = [{ day: 1, balance: proj.start, items: [] as Projection['events'] }, ...[...days].map(([day, v]) => ({ day, ...v }))]
  const values = [...points.map((p) => p.balance), SAFETY_BALANCE, 0]
  const hiRaw = Math.max(...values)
  const loRaw = Math.min(...values)
  const pad = (hiRaw - loRaw) * 0.08 || 1_000_000
  const hi = hiRaw + pad
  const lo = Math.min(0, loRaw - pad)
  const x = (day: number) => left + ((day - 1) / Math.max(1, proj.lastDay - 1)) * (right - left)
  const y = (v: number) => top + ((hi - v) / (hi - lo)) * (bottom - top)
  // 계단: 그날 0시에 바뀐다고 보고 수평 → 수직
  let path = `M${x(1)},${y(proj.start)}`
  for (const p of points.slice(1)) path += ` H${x(p.day)} V${y(p.balance)}`
  path += ` H${x(proj.lastDay)}`
  const ticks = [lo, (lo + hi) / 2, hi].map((v) => Math.round(v / 1e5) * 1e5)
  const dayTicks = [1, 5, 10, 15, 20, 25, proj.lastDay].filter((d, i, a) => a.indexOf(d) === i)

  return (
    <ChartHover
      width={width}
      height={height}
      plotTop={top}
      plotBottom={bottom}
      label="이번 달 예상 잔액 추이"
      points={points.map((p) => ({ x: x(p.day), y: y(p.balance) }))}
      renderMarker={(i) => <circle cx={x(points[i].day)} cy={y(points[i].balance)} r={6} stroke="#fff" strokeWidth={2} style={{ fill: points[i].balance < SAFETY_BALANCE ? 'var(--bad)' : 'var(--violet-700)' }} />}
      renderTooltip={(i) => {
        const p = points[i]
        return (
          <>
            <TipTitle>{i === 0 ? '시작 잔액' : `${p.day}일`}</TipTitle>
            {p.items.map((e) => (
              <TipRow key={e.item.id} label={e.item.name} value={`${e.delta > 0 ? '+' : '−'}${formatWon(Math.abs(e.delta))}원`} />
            ))}
            <TipRow line label="잔액" value={<span style={{ color: p.balance < SAFETY_BALANCE ? 'var(--bad)' : undefined }}>{formatWon(p.balance)}원</span>} strong />
          </>
        )
      }}
    >
      {ticks.map((v) => (
        <g key={v}>
          <line x1={left} x2={right} y1={y(v)} y2={y(v)} style={{ stroke: 'var(--line)' }} />
          <text x={left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} style={{ fill: 'var(--text-sub)' }}>
            {formatShort(v)}
          </text>
        </g>
      ))}
      <line x1={left} x2={right} y1={y(SAFETY_BALANCE)} y2={y(SAFETY_BALANCE)} strokeDasharray="5 4" strokeWidth={1.5} style={{ stroke: 'var(--bad)' }} />
      <text x={right} y={y(SAFETY_BALANCE) - 6} textAnchor="end" fontSize={11} style={{ fill: 'var(--bad)' }}>
        안전 잔액 {formatShort(SAFETY_BALANCE)}
      </text>
      <path d={path} fill="none" strokeWidth={2.5} style={{ stroke: 'var(--violet-700)' }} />
      {points.map((p) => (
        <circle key={p.day} cx={x(p.day)} cy={y(p.balance)} r={3.5} style={{ fill: p.balance < SAFETY_BALANCE ? 'var(--bad)' : 'var(--violet-700)' }} />
      ))}
      {dayTicks.map((d) => (
        <text key={d} x={x(d)} y={height - 6} textAnchor="middle" fontSize={11} style={{ fill: 'var(--text-sub)' }}>
          {d}일
        </text>
      ))}
    </ChartHover>
  )
}

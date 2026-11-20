import type { ReactNode } from 'react'
import { Card, CardHeader, ChartHover, Icon, ProgressBar, Segmented } from '../../components/ui'
import { FireHead, GoalCard, MILESTONES, MilestoneDot, milestoneTextStyle, NetWorthTip, NW_MONTH_LABELS } from './FireShared'

interface Indicator {
  label: string
  value: string
  pct: number
  current: string
  target: string
  footer: ReactNode
}

const INDICATORS: Indicator[] = [
  {
    label: '지표 A · 자산 목표 (4% 법칙)',
    value: '30.5%',
    pct: 30.51638576779026,
    current: '8.0억',
    target: '26.3억',
    footer: (
      <div
        style={{
          marginTop: 14,
          padding: '10px 12px',
          borderRadius: 12,
          background: 'var(--violet-100)',
          fontSize: 13,
          color: 'var(--violet-700)',
          fontWeight: 600,
        }}
      >
        기본 시나리오 기준 2044년 도달 예상
      </div>
    ),
  },
  {
    label: '지표 B · 현금흐름 목표',
    value: '7.5%',
    pct: 7.464788957349734,
    current: '월 654,321원',
    target: '월 8,765,432원',
    footer: <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-sub)' }}>최근 3개월 평균 세후 배당/이자</div>,
  },
  {
    label: '지표 C · 세미 FIRE',
    value: '87.3%',
    pct: 87.2782088017263,
    current: '월 7,650,312원',
    target: '월 8,765,432원',
    footer: <div style={{ marginTop: 14, fontSize: 13, color: 'var(--warn)', fontWeight: 600 }}>부족분 월 1,115,120원</div>,
  },
]

export function PcFire() {
  return (
    <>
      <FireHead active="status" />
      <GoalCard />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '24px 0 16px',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>경제적 자유 레벨</h2>
        <Segmented label="생활비 기준" options={['기본 생활비', '전체 지출']} defaultValue="전체 지출" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}>
        {INDICATORS.map((ind) => (
          <Card key={ind.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label">{ind.label}</span>
              <Icon name="info" size={18} color="var(--text-sub)" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '8px 0 12px' }}>
              <span style={{ fontSize: 36, fontWeight: 700 }}>{ind.value}</span>
            </div>
            <ProgressBar pct={ind.pct} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                marginTop: 10,
                color: 'var(--text-sub)',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <span>
                현재 <b style={{ color: 'var(--text)' }}>{ind.current}</b>
              </span>
              <span>
                목표 <b style={{ color: 'var(--text)' }}>{ind.target}</b>
              </span>
            </div>
            {ind.footer}
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: 20 }}>
        <CardHeader title="마일스톤 · 지표 A" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', position: 'relative' }}>
          {MILESTONES.map((m, i) => (
            <div
              key={m.pct}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 15,
                  left: i === 0 ? '50%' : 0,
                  right: i === MILESTONES.length - 1 ? '50%' : 0,
                  height: 3,
                  background: m.done ? 'var(--violet-700)' : 'var(--line)',
                }}
              />
              <MilestoneDot done={m.done} size={32} checkSize={16} checkStroke={2.5} />
              <b style={{ fontSize: 15 }}>{m.pct}</b>
              <span style={milestoneTextStyle(m.done)}>{m.text}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ marginTop: 20 }}>
        <CardHeader
          title="월별 순자산 추이"
          right={<Segmented label="기간" size="sm" options={['1년', '3년', '전체']} defaultValue="1년" />}
        />
        <NetWorthChart />
        <div className="fire-legend">
          {NW_LEGEND.map((l) => (
            <span key={l.label} className="fire-legend__item">
              <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
              {l.label}
            </span>
          ))}
          <span className="fire-legend__item">
            <span style={{ width: 14, height: 2.5, background: 'var(--text)' }} />
            순자산
          </span>
        </div>
      </Card>
    </>
  )
}

/* ───────── 월별 순자산 추이 차트 ───────── */
const NW_LEGEND = [
  { label: '부동산', color: 'var(--chart-1)' },
  { label: '금융투자', color: 'var(--chart-2)' },
  { label: '예적금', color: 'var(--chart-3)' },
  { label: '연금·기타', color: 'var(--chart-4)' },
  { label: '부채', color: 'var(--line-strong)' },
]

const Y_GRID = [
  { y: 269.9, label: '-10억' },
  { y: 190.2, label: '0억', zero: true },
  { y: 110.5, label: '10억' },
  { y: 30.8, label: '20억' },
  { y: -48.9, label: '30억' },
]

/** 막대 x · [금융투자 y,h] · [예적금 y,h] · [연금·기타 y,h] · 부채 h · 순자산 선 y · x축 라벨 */
interface NwBar {
  x: number
  fin: [number, number]
  dep: [number, number]
  pen: [number, number]
  debt: number
  line: number
  label?: string
}

const NW_BARS: NwBar[] = [
  { x: 73.1, fin: [38.2, 53.6], dep: [36.6, 1.6], pen: [35.6, 1.0], debt: 67.7, line: 103.3 },
  { x: 158.8, fin: [37.2, 54.6], dep: [35.5, 1.7], pen: [34.5, 1.0], debt: 67.5, line: 102.0, label: '25-12' },
  { x: 244.5, fin: [36.3, 55.5], dep: [34.4, 1.8], pen: [33.5, 1.0], debt: 67.3, line: 100.8 },
  { x: 330.1, fin: [35.3, 56.4], dep: [33.4, 2.0], pen: [32.4, 1.0], debt: 67.2, line: 99.6, label: '26-02' },
  { x: 415.8, fin: [34.4, 57.4], dep: [32.8, 1.6], pen: [31.8, 1.0], debt: 67.0, line: 98.8 },
  { x: 501.5, fin: [33.5, 58.3], dep: [31.7, 1.8], pen: [30.7, 1.0], debt: 66.8, line: 97.5, label: '26-04' },
  { x: 587.1, fin: [32.5, 59.3], dep: [30.6, 1.9], pen: [29.6, 1.0], debt: 66.7, line: 96.3 },
  { x: 672.8, fin: [31.6, 60.2], dep: [30.0, 1.6], pen: [29.0, 1.0], debt: 66.5, line: 95.5, label: '26-06' },
  { x: 758.5, fin: [30.6, 61.1], dep: [28.9, 1.7], pen: [28.0, 1.0], debt: 66.3, line: 94.3 },
  { x: 844.1, fin: [29.7, 62.1], dep: [27.9, 1.8], pen: [26.9, 1.0], debt: 66.2, line: 93.1, label: '26-08' },
  { x: 929.8, fin: [28.8, 63.0], dep: [26.8, 2.0], pen: [25.8, 1.0], debt: 66.0, line: 91.8 },
  { x: 1015.5, fin: [27.8, 64.0], dep: [26.2, 1.6], pen: [25.2, 1.0], debt: 65.8, line: 91.0, label: '26-10' },
]

const BAR_W = 51.4
const HALF = 25.7
const ZERO_Y = 190.2

const ESTATE = { y: 91.8, h: 98.4 }
const TEN_Y = 110.5 // 10억선

function NetWorthChart() {
  const points = NW_BARS.map((b) => `${(b.x + HALF).toFixed(1)},${b.line}`).join(' ')
  return (
    <ChartHover
      width={1100}
      height={300}
      plotTop={14}
      plotBottom={ZERO_Y + 70}
      label="월별 순자산 추이"
      points={NW_BARS.map((b) => ({ x: b.x + HALF, y: b.pen[0] }))}
      renderMarker={(i) => {
        const b = NW_BARS[i]
        return (
          <>
            <rect x={b.x - 2} y={b.pen[0] - 2} width={BAR_W + 4} height={ZERO_Y + b.debt - b.pen[0] + 4} rx={4} fill="none" stroke="var(--violet-900)" strokeWidth={1.5} />
            <circle cx={b.x + HALF} cy={b.line} r={6} stroke="#FFFFFF" strokeWidth={2} style={{ fill: 'var(--text)' }} />
          </>
        )
      }}
      renderTooltip={(i) => {
        const b = NW_BARS[i]
        return (
          <NetWorthTip
            month={NW_MONTH_LABELS[i]}
            zeroY={ZERO_Y}
            tenY={TEN_Y}
            h={{ estate: ESTATE.h, fin: b.fin[1], dep: b.dep[1], pen: b.pen[1], debt: b.debt, net: ZERO_Y - b.line }}
          />
        )
      }}
    >
      {Y_GRID.map((g) => (
        <g key={g.label}>
          <line x1={56} x2={1084} y1={g.y} y2={g.y} style={{ stroke: g.zero ? 'var(--line-strong)' : 'var(--line)' }} />
          <text x={50} y={g.y + 4} textAnchor="end" fontSize={11} style={{ fill: 'var(--text-sub)' }}>
            {g.label}
          </text>
        </g>
      ))}
      {NW_BARS.map((b) => (
        <g key={b.x}>
          <rect x={b.x} y={ESTATE.y} width={BAR_W} height={ESTATE.h} style={{ fill: 'var(--chart-1)' }} />
          <rect x={b.x} y={b.fin[0]} width={BAR_W} height={b.fin[1]} style={{ fill: 'var(--chart-2)' }} />
          <rect x={b.x} y={b.dep[0]} width={BAR_W} height={b.dep[1]} style={{ fill: 'var(--chart-3)' }} />
          <rect x={b.x} y={b.pen[0]} width={BAR_W} height={b.pen[1]} style={{ fill: 'var(--chart-4)' }} />
          <rect x={b.x} y={ZERO_Y} width={BAR_W} height={b.debt} style={{ fill: 'var(--line-strong)' }} />
          {b.label && (
            <text x={b.x + HALF} y={290} textAnchor="middle" fontSize={11} style={{ fill: 'var(--text-sub)' }}>
              {b.label}
            </text>
          )}
        </g>
      ))}
      <polyline points={points} fill="none" strokeWidth={2.5} style={{ stroke: 'var(--text)' }} />
      {NW_BARS.map((b) => (
        <circle key={b.x} cx={b.x + HALF} cy={b.line} r={3.5} style={{ fill: 'var(--text)' }} />
      ))}
    </ChartHover>
  )
}

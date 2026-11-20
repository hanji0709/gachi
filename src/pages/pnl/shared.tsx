import type { CSSProperties } from 'react'
import { Card, ChartHover, Delta, Label, Money, TipRow, TipTitle, linearScale, parseAxisLabel, type Tone } from '../../components/ui'
import { formatShort } from '../../data/format'

/* ───────── 요약 지표 ───────── */
export interface PnlSummary {
  label: string
  value: string
  /** 금액이면 '원' 단위, 비율이면 단위 없이 그대로 */
  isMoney: boolean
  delta: string
  /** 모바일 시안의 증감 값 (PC와 다를 때만) */
  mDelta?: string
  tone: Tone
}

export const SUMMARY: PnlSummary[] = [
  { label: '총 수입', value: '31,592,590', isMoney: true, delta: '▲ +812,000원', mDelta: '▲ +234,567원', tone: 'good' },
  { label: '총 지출', value: '20,297,529', isMoney: true, delta: '▼ −54,000원', mDelta: '▼ −12,345원', tone: 'good' },
  { label: '순이익', value: '11,295,061', isMoney: true, delta: '▲ +866,000원', mDelta: '▲ +246,912원', tone: 'good' },
  { label: '저축/투자율', value: '32.83%', isMoney: false, delta: '▲ +0.84%p', tone: 'good' },
]

/** 요약 카드: PC(숫자 26px) · 모바일(숫자 17px, 비율 20px) */
export function PnlStatCard({ item, m }: { item: PnlSummary; m?: boolean }) {
  const margin = m ? '4px 0 2px' : '6px 0 4px'
  return (
    <Card pad={m ? 'sm' : 'lg'}>
      <Label>{item.label}</Label>
      {item.isMoney ? (
        <div style={{ margin }}>
          <Money value={item.value} size={m ? 17 : 26} unitSize={m ? 12 : 13} />
        </div>
      ) : (
        <div style={{ fontSize: m ? 20 : 26, fontWeight: m ? 700 : 600, margin }}>{item.value}</div>
      )}
      <Delta tone={item.tone} suffix=" 전기 대비" size={m ? 12 : 13}>
        {m ? (item.mDelta ?? item.delta) : item.delta}
      </Delta>
    </Card>
  )
}

/* ───────── 월별 수입·지출 추이 차트 ───────── */
export interface TrendMonth {
  label: string
  /** 월 중심 x */
  x: number
  /** 막대 윗변 y */
  incomeY: number
  expenseY: number
  /** 순이익 점 y */
  netY: number
}

interface TrendChartProps {
  width: number
  height: number
  /** 가로 격자 오른쪽 끝 */
  xEnd: number
  /** 0선 y */
  baseY: number
  grid: { y: number; label: string }[]
  months: TrendMonth[]
}

/**
 * 막대(수입·지출) + 꺾은선(순이익)
 * 마우스오버·터치한 달의 금액을 레이어 팝업으로 (값은 축 눈금으로 좌표를 되돌린 만원 단위)
 */
export function TrendChart({ width, height, xEnd, baseY, grid, months }: TrendChartProps) {
  const top = grid[grid.length - 1]
  const valueOf = linearScale(baseY, 0, top.y, parseAxisLabel(top.label))
  const won = (y: number) => `${formatShort(valueOf(y))}원`
  return (
    <ChartHover
      width={width}
      height={height}
      plotTop={top.y - 10}
      plotBottom={baseY}
      label="월별 수입 지출 추이"
      points={months.map((mo) => ({ x: mo.x, y: Math.min(mo.incomeY, mo.expenseY, mo.netY) }))}
      renderMarker={(i) => {
        const mo = months[i]
        return (
          <>
            <rect x={mo.x - 27} y={mo.incomeY - 1} width={24} height={baseY - mo.incomeY + 1} rx={6} fill="none" stroke="var(--violet-900)" strokeWidth={1.5} />
            <rect x={mo.x + 3} y={mo.expenseY - 1} width={24} height={baseY - mo.expenseY + 1} rx={6} fill="none" stroke="var(--violet-900)" strokeWidth={1.5} />
            <circle cx={mo.x} cy={mo.netY} r={6} fill="var(--violet-900)" stroke="#FFFFFF" strokeWidth={2} />
          </>
        )
      }}
      renderTooltip={(i) => {
        const mo = months[i]
        return (
          <>
            <TipTitle>{mo.label}</TipTitle>
            <TipRow color="var(--chart-1)" label="총 수입" value={won(mo.incomeY)} />
            <TipRow color="var(--chart-2)" label="총 지출" value={won(mo.expenseY)} />
            <TipRow color="var(--violet-900)" line label="순이익" value={won(mo.netY)} strong />
          </>
        )
      }}
    >
      {grid.map((g) => (
        <g key={g.label}>
          <line x1={48} x2={xEnd} y1={g.y} y2={g.y} stroke="var(--line)" />
          <text x={42} y={g.y + 4} textAnchor="end" fontSize={11} fill="var(--text-sub)">
            {g.label}
          </text>
        </g>
      ))}
      {months.map((mo) => (
        <g key={mo.label}>
          <rect x={mo.x - 26} y={mo.incomeY} width={22} height={baseY - mo.incomeY} rx={5} fill="var(--chart-1)" />
          <rect x={mo.x + 4} y={mo.expenseY} width={22} height={baseY - mo.expenseY} rx={5} fill="var(--chart-2)" />
          <text x={mo.x} y={baseY + 20} textAnchor="middle" fontSize={12} fill="var(--text-sub)">
            {mo.label}
          </text>
        </g>
      ))}
      <polyline
        points={months.map((mo) => `${mo.x},${mo.netY}`).join(' ')}
        fill="none"
        stroke="var(--violet-900)"
        strokeWidth={2}
      />
      {months.map((mo) => (
        <circle key={mo.label} cx={mo.x} cy={mo.netY} r={4} fill="var(--violet-900)" stroke="#FFFFFF" strokeWidth={2} />
      ))}
    </ChartHover>
  )
}

const swatch: CSSProperties = { display: 'inline-block', width: 10, height: 10, borderRadius: 3, marginRight: 6 }

export function TrendLegend() {
  return (
    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-sub)', marginTop: 8, flexWrap: 'wrap' }}>
      <span>
        <span style={{ ...swatch, background: 'var(--chart-1)' }} />
        총 수입
      </span>
      <span>
        <span style={{ ...swatch, background: 'var(--chart-2)' }} />
        총 지출
      </span>
      <span>
        <span
          style={{
            display: 'inline-block',
            width: 14,
            height: 2,
            background: 'var(--violet-900)',
            marginRight: 6,
            verticalAlign: 'middle',
          }}
        />
        순이익
      </span>
    </div>
  )
}

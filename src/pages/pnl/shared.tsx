import type { CSSProperties } from 'react'
import { Card, ChartHover, Delta, Label, Money, TipRow, TipTitle, type Tone } from '../../components/ui'
import { formatDelta, formatPct, formatShort, formatWon } from '../../data/format'
import type { PnlView, TrendBucket } from './usePnlView'

/* ───────── 요약 지표 ───────── */
export interface PnlStat {
  label: string
  value: string
  /** 금액이면 '원' 단위, 비율이면 단위 없이 그대로 */
  isMoney: boolean
  /** 직전 같은 길이 기간 대비 (없으면 표시 안 함) */
  delta: string | null
  tone: Tone
}

/** 총 수입 · 총 지출 · 순이익 · 저축/투자율 */
export function pnlStats(view: NonNullable<PnlView['view']>): PnlStat[] {
  const c = view.cur.summary
  const p = view.prev?.summary
  const money = (label: string, cur: number, prev: number | undefined, upIsGood: boolean): PnlStat => {
    const diff = prev === undefined ? null : cur - prev
    return {
      label,
      value: formatWon(cur),
      isMoney: true,
      delta: diff === null ? null : formatDelta(diff),
      tone: diff === null || diff === 0 ? 'neutral' : diff > 0 === upIsGood ? 'good' : 'bad',
    }
  }
  const rateDiff = p && Number.isFinite(c.savingRate) && Number.isFinite(p.savingRate) ? c.savingRate - p.savingRate : null
  return [
    money('총 수입', c.income, p?.income, true),
    money('총 지출', c.expense, p?.expense, false),
    money('순이익', c.net, p?.net, true),
    {
      label: '저축/투자율',
      value: formatPct(c.savingRate),
      isMoney: false,
      delta: rateDiff === null ? null : `${rateDiff >= 0 ? '▲ +' : '▼ −'}${(Math.abs(rateDiff) * 100).toFixed(2)}%p`,
      tone: rateDiff === null || rateDiff === 0 ? 'neutral' : rateDiff > 0 ? 'good' : 'bad',
    },
  ]
}

/** 요약 카드: PC(숫자 26px) · 모바일(숫자 17px, 비율 20px) */
export function PnlStatCard({ item, m }: { item: PnlStat; m?: boolean }) {
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
      {item.delta ? (
        <Delta tone={item.tone} suffix=" 직전 기간 대비" size={m ? 12 : 13}>
          {item.delta}
        </Delta>
      ) : (
        <span className="micro">직전 기간 결산 없음</span>
      )}
    </Card>
  )
}

/* ───────── 월별 수입·지출 추이 차트 ───────── */

/** 보기 좋은 눈금 간격 (1·2·5 × 10ⁿ) */
function niceStep(max: number, ticks: number): number {
  const raw = max / ticks
  const pow = 10 ** Math.floor(Math.log10(raw))
  const f = raw / pow
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow
}

/**
 * 막대(수입·지출) + 꺾은선(순이익). 마우스오버·터치한 달의 금액을 레이어 팝업으로.
 */
export function TrendChart({ data, width, height }: { data: TrendBucket[]; width: number; height: number }) {
  if (data.length === 0) {
    return <p className="caption" style={{ padding: '32px 0', textAlign: 'center' }}>이 기간에 입력된 결산이 없어요.</p>
  }
  const left = 52
  const right = width - 12
  const top = 16
  const baseLabelGap = 28
  const maxV = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense, d.net)))
  const minV = Math.min(0, ...data.map((d) => d.net))
  const step = niceStep(maxV - minV, 3)
  const hi = Math.ceil(maxV / step) * step
  const lo = Math.floor(minV / step) * step
  const plotBottom = height - baseLabelGap
  const y = (v: number) => top + ((hi - v) / (hi - lo)) * (plotBottom - top)
  const zeroY = y(0)
  const ticks: number[] = []
  for (let v = lo; v <= hi + 1e-6; v += step) ticks.push(v)

  const slot = (right - left) / data.length
  const barW = Math.max(4, Math.min(22, slot * 0.32))
  const xs = data.map((_, i) => left + slot * (i + 0.5))
  const labelW = data.some((d) => d.label.length > 4) ? 64 : 44
  const labelEvery = Math.ceil(data.length / Math.max(1, Math.floor((right - left) / labelW)))
  // 선택한 기간만 진하게, 나머지는 옅게
  const anyCurrent = data.some((d) => d.current)
  const op = (d: TrendBucket) => (!anyCurrent || d.current ? 1 : 0.45)

  return (
    <ChartHover
      width={width}
      height={height}
      plotTop={top}
      plotBottom={plotBottom}
      label="월별 수입 지출 추이"
      points={data.map((d, i) => ({ x: xs[i], y: Math.min(y(d.income), y(d.expense), y(d.net)) }))}
      renderMarker={(i) => {
        const d = data[i]
        const x = xs[i]
        return (
          <>
            <rect x={x - barW - 3} y={y(d.income) - 1} width={barW + 2} height={zeroY - y(d.income) + 1} rx={5} fill="none" stroke="var(--violet-900)" strokeWidth={1.5} />
            <rect x={x + 1} y={y(d.expense) - 1} width={barW + 2} height={zeroY - y(d.expense) + 1} rx={5} fill="none" stroke="var(--violet-900)" strokeWidth={1.5} />
            <circle cx={x} cy={y(d.net)} r={6} fill="var(--violet-900)" stroke="#FFFFFF" strokeWidth={2} />
          </>
        )
      }}
      renderTooltip={(i) => {
        const d = data[i]
        return (
          <>
            <TipTitle>{d.title}</TipTitle>
            <TipRow color="var(--chart-1)" label="총 수입" value={`${formatWon(d.income)}원`} />
            <TipRow color="var(--chart-2)" label="총 지출" value={`${formatWon(d.expense)}원`} />
            <TipRow color="var(--violet-900)" line label="순이익" value={`${formatWon(d.net)}원`} strong />
          </>
        )
      }}
    >
      {ticks.map((v) => (
        <g key={v}>
          <line x1={left} x2={right} y1={y(v)} y2={y(v)} stroke={v === 0 ? 'var(--line-strong)' : 'var(--line)'} />
          <text x={left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--text-sub)">
            {formatShort(v)}
          </text>
        </g>
      ))}
      {data.map((d, i) => (
        <g key={d.key} opacity={op(d)}>
          <rect x={xs[i] - barW - 2} y={y(d.income)} width={barW} height={Math.max(0, zeroY - y(d.income))} rx={4} fill="var(--chart-1)" />
          <rect x={xs[i] + 2} y={y(d.expense)} width={barW} height={Math.max(0, zeroY - y(d.expense))} rx={4} fill="var(--chart-2)" />
          {i % labelEvery === 0 && (
            <text x={xs[i]} y={height - 8} textAnchor="middle" fontSize={12} fill={d.current ? 'var(--text)' : 'var(--text-sub)'} fontWeight={d.current ? 700 : 400}>
              {d.label}
            </text>
          )}
        </g>
      ))}
      <polyline points={data.map((d, i) => `${xs[i]},${y(d.net)}`).join(' ')} fill="none" stroke="var(--violet-900)" strokeWidth={2} />
      {data.map((d, i) => (
        <circle key={d.key} cx={xs[i]} cy={y(d.net)} r={4} fill="var(--violet-900)" stroke="#FFFFFF" strokeWidth={2} />
      ))}
    </ChartHover>
  )
}

const swatch: CSSProperties = { display: 'inline-block', width: 10, height: 10, borderRadius: 3, marginRight: 6 }

export function TrendLegend() {
  return (
    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-sub)', marginTop: 8, flexWrap: 'wrap' }}>
      <span>
        <span style={{ ...swatch, background: 'var(--chart-1)' }} />총 수입
      </span>
      <span>
        <span style={{ ...swatch, background: 'var(--chart-2)' }} />총 지출
      </span>
      <span>
        <span style={{ display: 'inline-block', width: 14, height: 2, background: 'var(--violet-900)', marginRight: 6, verticalAlign: 'middle' }} />
        순이익
      </span>
    </div>
  )
}

/* ───────── 흐름표 공통: 1단계 노드 ───────── */
export interface FlowGroup {
  key: 'fixed' | 'variable' | 'saving' | 'mismatch'
  label: string
  amount: number
  /** 총 수입 대비 */
  share: number
  /** 펼쳤을 때 세부 항목 (금액 큰 순, 0원 제외) */
  details: { name: string; amount: number; share: number }[]
}

export function flowGroups(view: NonNullable<PnlView['view']>): FlowGroup[] {
  const { summary, byGroup } = view.cur
  const inc = summary.income
  const share = (n: number) => (inc > 0 ? n / inc : 0)
  const details = (g: 'fixed' | 'variable' | 'saving') =>
    byGroup[g].filter((t) => t.amount > 0).map((t) => ({ name: t.item.name, amount: t.amount, share: share(t.amount) }))
  const groups: FlowGroup[] = [
    { key: 'fixed', label: '고정지출', amount: summary.fixed, share: share(summary.fixed), details: details('fixed') },
    { key: 'variable', label: '변동지출', amount: summary.variable, share: share(summary.variable), details: details('variable') },
    { key: 'saving', label: '저축/투자/상환', amount: summary.saving, share: share(summary.saving), details: details('saving') },
  ]
  if (summary.mismatch !== 0) groups.push({ key: 'mismatch', label: '불일치하는 차액', amount: summary.mismatch, share: share(summary.mismatch), details: [] })
  return groups
}

/** 총 수입 아래 줄: "근로 x · 배당/이자 y" */
export function incomeBreakdown(view: NonNullable<PnlView['view']>): string {
  return view.cur.byGroup.income
    .filter((t) => t.amount > 0)
    .map((t) => `${t.item.name.replace(/^세후\s*/, '').replace(/소득$/, '')} ${formatWon(t.amount)}`)
    .join(' · ')
}

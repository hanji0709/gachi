import { useState } from 'react'
import { Card, CardHeader, ProgressBar, Segmented } from '../../components/ui'
import { formatPct, formatShort, formatWon } from '../../data/format'
import { NetWorthChart, NW_LEGEND } from './FireCharts'
import { indicators, type FireData, type Indicator } from './fireModel'
import { FireHead } from './FireShared'
import { PcForecastSection, reachInfo } from './FireForecast'
import { useForecast } from './useForecast'
import { InfoTip } from './InfoTip'
import { EditTargetsButton, TargetsEditor } from './TargetsEditor'

export type NwPeriod = '1년' | '3년' | '전체'
export const periodSeries = (data: FireData, period: NwPeriod) => (period === '전체' ? data.series : data.series.slice(period === '1년' ? -12 : -36))

const money = (ind: Indicator, n: number) => (ind.monthly ? `월 ${formatWon(n)}원` : `${formatShort(n)}`)
const noteColor = (ind: Indicator) => (ind.ratio >= 1 ? 'var(--good)' : undefined)

export function PcFire({ data }: { data: FireData }) {
  const [period, setPeriod] = useState<NwPeriod>('1년')
  const [editing, setEditing] = useState(false)
  // 가정 카드의 '예측해보기' 결과가 지표 A 도달 연도에도 쓰임
  const f = useForecast(data)
  return (
    <>
      <FireHead />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 16px', gap: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>경제적 자유 레벨</h2>
        <EditTargetsButton open={editing} onClick={() => setEditing((v) => !v)} />
      </div>
      {editing && <TargetsEditor targets={data.targets} onDone={() => setEditing(false)} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20 }}>
        {indicators(data, reachInfo(f, data)).map((ind) => (
          <Card key={ind.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label">{ind.label}</span>
              <InfoTip label={ind.label} text={ind.guide} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '8px 0 12px' }}>
              <span style={{ fontSize: 36, fontWeight: 700 }}>{formatPct(ind.ratio, 1)}</span>
            </div>
            <ProgressBar pct={Math.min(100, ind.ratio * 100)} color={ind.ratio >= 1 ? 'var(--good)' : undefined} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 10, color: 'var(--text-sub)', gap: 8, flexWrap: 'wrap' }}>
              <span>
                현재 <b style={{ color: 'var(--text)' }}>{money(ind, ind.current)}</b>
              </span>
              <span>
                목표 <b style={{ color: 'var(--text)' }}>{money(ind, ind.target)}</b>
              </span>
            </div>
            {ind.key === 'A' ? (
              <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 12, background: 'var(--violet-100)', fontSize: 13, color: noteColor(ind) ?? 'var(--violet-700)', fontWeight: 600 }}>
                {ind.note}
                {ind.sub && <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-sub)', marginTop: 2 }}>{ind.sub}</div>}
              </div>
            ) : (
              <div style={{ marginTop: 14, fontSize: 12, color: noteColor(ind) ?? 'var(--text-sub)' }}>{ind.note}</div>
            )}
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: 20 }}>
        <CardHeader title="월별 순자산 추이" right={<Segmented label="기간" size="sm" options={['1년', '3년', '전체']} value={period} onChange={(v) => setPeriod(v as NwPeriod)} />} />
        <NetWorthChart series={periodSeries(data, period)} width={1100} height={320} />
        <NwLegend />
      </Card>

      <PcForecastSection f={f} data={data} />
    </>
  )
}

export function NwLegend({ m }: { m?: boolean }) {
  const sw = m ? 8 : 10
  return (
    <div className="fire-legend" style={m ? { gap: '6px 12px' } : undefined}>
      {NW_LEGEND.map((l) => (
        <span key={l.label} className="fire-legend__item">
          <span style={{ width: sw, height: sw, borderRadius: m ? 2 : 3, background: l.color }} />
          {l.label}
        </span>
      ))}
      <span className="fire-legend__item">
        <span style={{ width: m ? 12 : 14, height: 2.5, background: 'var(--text)' }} />
        순자산
      </span>
    </div>
  )
}

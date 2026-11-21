import { useState } from 'react'
import { Card, CardHeader, Delta, ProgressBar, Segmented } from '../../components/ui'
import { formatDelta, formatPct, formatShort } from '../../data/format'
import { NetWorthChart } from './FireCharts'
import { indicators, type FireData } from './fireModel'
import { MForecastSection, reachInfo } from './FireForecast'
import { InfoTip } from './InfoTip'
import { EditTargetsButton, TargetsEditor } from './TargetsEditor'
import { NwLegend, periodSeries, type NwPeriod } from './PcFire'
import { useForecast } from './useForecast'

/** 모바일 경제적 자유 (달성 현황 + 미래 예측 한 화면) */
export function MFire({ data }: { data: FireData }) {
  return <MStatus data={data} />
}

const mMoney = (monthly: boolean, n: number) => (monthly ? `월 ${formatShort(n)}` : formatShort(n))

function MStatus({ data }: { data: FireData }) {
  const [period, setPeriod] = useState<NwPeriod>('1년')
  const [editing, setEditing] = useState(false)
  const f = useForecast(data)
  const [a, ...rest] = indicators(data, reachInfo(f, data))
  const series = periodSeries(data, period)
  const last = series[series.length - 1]
  const prev = series[series.length - 2]
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b style={{ fontSize: 16 }}>경제적 자유 레벨</b>
        <EditTargetsButton open={editing} onClick={() => setEditing((v) => !v)} />
      </div>
      {editing && <TargetsEditor targets={data.targets} onDone={() => setEditing(false)} m />}

      <Card hero style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>경제적 자유까지</span>
          <InfoTip label={a.label} text={a.guide} color="rgba(255,255,255,0.9)" size={16} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '4px 0 10px' }}>
          <span style={{ fontSize: 40, fontWeight: 700, color: '#fff' }}>{formatPct(a.ratio, 1)}</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>지표 A · 자산 목표</span>
        </div>
        <ProgressBar pct={Math.min(100, a.ratio * 100)} height={10} color="var(--cyan-500)" track="rgba(255,255,255,0.25)" />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 8 }}>
          <span>현재 {formatShort(a.current)}</span>
          <span>목표 {formatShort(a.target)}</span>
        </div>
        <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.16)', padding: '8px 12px', borderRadius: 12 }}>
          {a.note}
          {a.sub && <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.85, marginTop: 2 }}>{a.sub}</div>}
        </div>
      </Card>

      {rest.map((ind) => (
        <Card key={ind.key} pad="sm">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label">{ind.label}</span>
            <InfoTip label={ind.label} text={ind.guide} size={16} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, margin: '4px 0 8px' }}>{formatPct(ind.ratio, 1)}</div>
          <ProgressBar pct={Math.min(100, ind.ratio * 100)} height={8} color={ind.ratio >= 1 ? 'var(--good)' : undefined} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-sub)', marginTop: 8 }}>
            <span>현재 {mMoney(ind.monthly, ind.current)}</span>
            <span>목표 {mMoney(ind.monthly, ind.target)}</span>
          </div>
          <div style={{ fontSize: 12, color: ind.ratio >= 1 ? 'var(--good)' : 'var(--text-sub)', marginTop: 6 }}>
            {ind.note}
          </div>
        </Card>
      ))}

      <Card pad="md">
        <CardHeader variant="m" title="월별 순자산 추이" right={<Segmented label="기간" size="sm" options={['1년', '3년', '전체']} value={period} onChange={(v) => setPeriod(v as NwPeriod)} />} />
        {last && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <b style={{ fontSize: 20 }}>{formatShort(last.net)}</b>
            {prev && (
              <Delta tone={last.net >= prev.net ? 'good' : 'bad'} size={12} suffix=" 전월 대비">
                {formatDelta(last.net - prev.net)}
              </Delta>
            )}
          </div>
        )}
        <NetWorthChart series={series} width={360} height={240} />
        <NwLegend m />
      </Card>

      <MForecastSection f={f} data={data} />
    </>
  )
}

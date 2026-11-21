import type { ReactNode } from 'react'
import { Card, CardHeader, DataTable, Segmented, type Column, type Row } from '../../components/ui'
import { formatShort } from '../../data/format'
import { ForecastChart, type ForecastBasis, type ForecastView } from './FireCharts'
import type { FireData, ReachInfo } from './fireModel'
import { AssumptionsPanel, type Forecast } from './useForecast'

export const startYearOf = (data: FireData) => Number(data.latest?.month.slice(0, 4) ?? new Date().getFullYear())

/** 지표 A 카드에 넘길 도달 연도 (가정 카드의 '예측해보기' 결과) */
export function reachInfo(f: Forecast, data: FireData): ReachInfo {
  const { reach, lowReach, highReach } = f.result
  return { reach, lowReach, highReach, years: f.applied.years, startYear: startYearOf(data) }
}

export function reachLabel(y: number | null, startYear: number, years: number): ReactNode {
  return <span style={{ color: y !== null ? 'var(--violet-700)' : 'var(--text-sub)' }}>{y === null ? `${years}년 안 어려움` : y <= startYear ? '이미 달성' : `${y}년`}</span>
}

function ForecastToggles({ f, m }: { f: Forecast; m?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Segmented label="보기" size="sm" options={['투자 가능 자산', '순자산']} value={f.view} onChange={(v) => f.setView(v as ForecastView)} block={m} />
      <Segmented label="금액 기준" size="sm" options={['명목', '실질']} value={f.basis} onChange={(v) => f.setBasis(v as ForecastBasis)} block={m} />
    </div>
  )
}

function ForecastLegend({ view }: { view: ForecastView }) {
  const line = { display: 'inline-block', width: 14, height: 2.5, marginRight: 6, verticalAlign: 'middle' } as const
  return (
    <div className="fire-legend">
      <span>
        <span style={{ ...line, background: 'var(--violet-700)' }} />
        {view} · 내 가정
      </span>
      <span>
        <span style={{ display: 'inline-block', width: 12, height: 10, background: 'var(--violet-700)', opacity: 0.15, marginRight: 6 }} />
        보수 ~ 낙관 범위
      </span>
      {view === '투자 가능 자산' && (
        <span>
          <span style={{ ...line, height: 0, borderTop: '2px dashed var(--warn-fill)' }} />
          목표 자산(물가 반영)
        </span>
      )}
    </div>
  )
}

/** 그래프 위 요약 한 줄: N년 후 순자산 (내 가정 · 보수 ~ 낙관) */
function ForecastSummary({ f }: { f: Forecast }) {
  const { base, low, high } = f.result
  const last = <T,>(a: T[]) => a[a.length - 1]
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
      <span className="label">{f.applied.years}년 후 순자산 · 내 가정</span>
      <b style={{ fontSize: 22 }}>{formatShort(last(base)?.net ?? 0)}원</b>
      <span className="micro">
        보수 {formatShort(last(low)?.net ?? 0)} ~ 낙관 {formatShort(last(high)?.net ?? 0)} · 명목
      </span>
    </div>
  )
}

const SCENARIO_COLUMNS = (years: number): Column[] => [
  { key: 'name', label: '시나리오', strong: true },
  { key: 'rate', label: '부동산 / 금융투자', align: 'right' },
  { key: 'y10', label: '10년 후 순자산', align: 'right' },
  { key: 'yEnd', label: `${years}년 후 순자산`, align: 'right', strong: true },
  { key: 'reach', label: '지표 A 도달', align: 'right', strong: true },
]

const DISCLAIMER = '시나리오마다 성장률만 다르고 물가·매달 넣는 돈·기간은 내 가정과 같아요. 예측은 입력한 가정에 따른 계산이며 투자 조언이 아닙니다.'

/** 미래 예측 (PC): 왼쪽 그래프·시나리오, 오른쪽 가정 */
export function PcForecastSection({ f, data }: { f: Forecast; data: FireData }) {
  const startYear = startYearOf(data)
  const rows: Row[] = f.result.scenarios.map((s) => ({
    name: s.name,
    rate: `${s.rates.re}% / ${s.rates.fin}%`,
    y10: formatShort(s.y10),
    yEnd: formatShort(s.yEnd),
    reach: reachLabel(s.reach, startYear, f.applied.years),
  }))
  return (
    <>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '32px 0 16px' }}>미래 예측</h2>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '999 1 640px', minWidth: 0 }}>
          <Card>
            <CardHeader title="미래 자산" right={<ForecastToggles f={f} />} />
            <ForecastSummary f={f} />
            <ForecastChart {...f.result} view={f.view} basis={f.basis} width={760} height={320} />
            <ForecastLegend view={f.view} />
          </Card>
          <Card style={{ marginTop: 20 }}>
            <CardHeader title="시나리오 비교" />
            <DataTable columns={SCENARIO_COLUMNS(f.applied.years)} rows={rows} caption="시나리오 비교" />
            <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--text-sub)' }}>{DISCLAIMER}</p>
          </Card>
        </div>
        <div style={{ flex: '1 1 340px', minWidth: 0 }}>
          <Card style={{ padding: 20 }}>
            <CardHeader title="가정" />
            <AssumptionsPanel f={f} recentMonths={data.recentMonths} />
          </Card>
        </div>
      </div>
    </>
  )
}

/** 미래 예측 (모바일): 그래프 → 가정 → 시나리오 */
export function MForecastSection({ f, data }: { f: Forecast; data: FireData }) {
  const startYear = startYearOf(data)
  return (
    <>
      <b style={{ fontSize: 16, marginTop: 8 }}>미래 예측</b>
      <Card pad="md">
        <CardHeader variant="m" title="미래 자산" />
        <ForecastToggles f={f} m />
        <div style={{ marginTop: 12 }}>
          <ForecastSummary f={f} />
          <ForecastChart {...f.result} view={f.view} basis={f.basis} width={360} height={260} />
        </div>
        <ForecastLegend view={f.view} />
      </Card>

      <Card pad="md">
        <CardHeader variant="m" title="가정" />
        <AssumptionsPanel f={f} recentMonths={data.recentMonths} />
      </Card>

      <Card pad="md">
        <CardHeader variant="m" title="시나리오 비교" />
        {f.result.scenarios.map((s) => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--line)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
                부동산 / 금융투자 {s.rates.re}% / {s.rates.fin}%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{formatShort(s.yEnd)}</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{reachLabel(s.reach, startYear, f.applied.years)}</div>
            </div>
          </div>
        ))}
        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-sub)' }}>
          {f.applied.years}년 후 순자산 · 지표 A 도달 연도 기준. {DISCLAIMER}
        </p>
      </Card>
    </>
  )
}

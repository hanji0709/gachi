import { Fragment, useMemo, useState } from 'react'
import { Button, Segmented, SubBox } from '../../components/ui'
import { formatNumber, parseAmount } from '../../data/format'
import { PRESETS, reachYear, simulate, type Assumptions, type FireData, type PresetName } from './fireModel'
import type { ForecastBasis, ForecastView } from './FireCharts'

type RateKey = 're' | 'fin' | 'dep' | 'etc' | 'inf'
type MoneyKey = 'invest' | 'repay'
/** 입력 중인 가정 (글자 그대로 들고 있다가 '예측해보기'에서 숫자로 바꿈) */
type Draft = Record<RateKey | MoneyKey, string> & { years: number }

const RATE_ROWS: { key: RateKey; label: string }[] = [
  { key: 're', label: '부동산' },
  { key: 'fin', label: '금융투자' },
  { key: 'dep', label: '예적금' },
  { key: 'etc', label: '기타' },
  { key: 'inf', label: '인플레이션' },
]
const MONEY_ROWS: { key: MoneyKey; label: string }[] = [
  { key: 'invest', label: '추가 투자액' },
  { key: 'repay', label: '부채 원금 상환' },
]
const PRESET_NAMES: PresetName[] = ['보수', '기본', '낙관']

const REF_RETURNS = [
  { k: '멀캠 APT', v: '9~10%' },
  { k: '서울 APT', v: '8~11%' },
  { k: '경기도 APT', v: '7~8%' },
  { k: '나스닥100', v: '19~20%' },
]

function parseDraft(d: Draft): Assumptions | null {
  const rate = (s: string) => {
    const n = Number(s.replace(/[%\s]/g, ''))
    return s.trim() !== '' && Number.isFinite(n) && n > -100 && n < 100 ? n : null
  }
  const out: Partial<Assumptions> = { years: d.years }
  for (const { key } of RATE_ROWS) {
    const n = rate(d[key])
    if (n === null) return null
    out[key] = n
  }
  for (const { key } of MONEY_ROWS) {
    const n = parseAmount(d[key])
    if (n === null) return null
    out[key] = n
  }
  return out as Assumptions
}

/** 미래 예측 상태: 프리셋 · 입력 중 가정 · 실제 예측에 쓴 가정 · 차트 보기 */
export function useForecast(data: FireData) {
  const initial: Draft = {
    re: String(PRESETS.기본.re),
    fin: String(PRESETS.기본.fin),
    dep: String(PRESETS.기본.dep),
    etc: String(PRESETS.기본.etc),
    inf: '2.5',
    invest: formatNumber(data.invest),
    repay: formatNumber(data.repay),
    years: 20,
  }
  const [draft, setDraft] = useState<Draft>(initial)
  const [preset, setPreset] = useState<PresetName | null>('기본')
  const [applied, setApplied] = useState<Assumptions>(() => parseDraft(initial)!)
  const [view, setView] = useState<ForecastView>('투자 가능 자산')
  const [basis, setBasis] = useState<ForecastBasis>('명목')

  const parsed = parseDraft(draft)
  const dirty = !parsed || JSON.stringify(parsed) !== JSON.stringify(applied)

  const result = useMemo(() => {
    const base = simulate(data, applied)
    const scen = (p: PresetName) => simulate(data, { ...applied, ...PRESETS[p] })
    const low = scen('보수')
    const high = scen('낙관')
    const scenarios = PRESET_NAMES.map((name) => {
      const pts = name === '보수' ? low : name === '낙관' ? high : scen('기본')
      return { name, rates: PRESETS[name], y10: pts[Math.min(10, pts.length - 1)]?.net ?? 0, yEnd: pts[pts.length - 1]?.net ?? 0, reach: reachYear(pts) }
    })
    return { base, low, high, reach: reachYear(base), lowReach: reachYear(low), highReach: reachYear(high), scenarios }
  }, [data, applied])

  return {
    draft,
    preset,
    applied,
    dirty,
    valid: Boolean(parsed),
    view,
    setView,
    basis,
    setBasis,
    result,
    setField: (key: RateKey | MoneyKey, v: string) => {
      setDraft((d) => ({ ...d, [key]: v }))
      if (key !== 'inf' && key !== 'invest' && key !== 'repay') setPreset(null)
    },
    setYears: (years: number) => setDraft((d) => ({ ...d, years })),
    choosePreset: (p: PresetName) => {
      setPreset(p)
      setDraft((d) => ({ ...d, ...Object.fromEntries(Object.entries(PRESETS[p]).map(([k, v]) => [k, String(v)])) }))
    },
    run: () => parsed && setApplied(parsed),
  }
}

export type Forecast = ReturnType<typeof useForecast>

function AssumeRow({ id, label, value, unit, onChange }: { id: string; label: string; value: string; unit: string; onChange: (v: string) => void }) {
  return (
    <div className="fire-assume__row">
      <label htmlFor={id}>{label}</label>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <input id={id} type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="fire-assume__input" />
        <span className="fire-assume__unit">{unit}</span>
      </span>
    </div>
  )
}

/** 가정 입력 + 예측해보기 (PC 오른쪽 카드 · 모바일 카드 공용) */
export function AssumptionsPanel({ f, recentMonths }: { f: Forecast; recentMonths: number }) {
  return (
    <>
      <Segmented label="프리셋" block options={PRESET_NAMES} value={f.preset ?? ''} onChange={(v) => f.choosePreset(v as PresetName)} />
      {!f.preset && <div className="micro" style={{ marginTop: 6 }}>성장률을 직접 입력했어요</div>}

      <div className="fire-assume__group" style={{ margin: '18px 0 2px' }}>
        연간 성장률
      </div>
      {RATE_ROWS.map((r) => (
        <AssumeRow key={r.key} id={`fire-g-${r.key}`} label={r.label} value={f.draft[r.key]} unit="%" onChange={(v) => f.setField(r.key, v)} />
      ))}

      <div className="fire-assume__group" style={{ margin: '14px 0 2px' }}>
        매달 넣는 돈 <span style={{ fontWeight: 400, color: 'var(--text-sub)' }}>· 결산 최근 {recentMonths}개월 평균</span>
      </div>
      {MONEY_ROWS.map((r) => (
        <AssumeRow key={r.key} id={`fire-m-${r.key}`} label={r.label} value={f.draft[r.key]} unit="원" onChange={(v) => f.setField(r.key, v)} />
      ))}

      <label htmlFor="fire-period" className="fire-assume__group" style={{ display: 'block', margin: '14px 0 8px' }}>
        예측 기간 · {f.draft.years}년
      </label>
      <input
        id="fire-period"
        type="range"
        min={5}
        max={40}
        value={f.draft.years}
        onChange={(e) => f.setYears(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--violet-700)' }}
      />

      {!f.valid && (
        <p role="alert" style={{ fontSize: 13, color: 'var(--bad)', fontWeight: 600, margin: '10px 0 0' }}>
          숫자로 입력해 주세요 (성장률은 %, 금액은 원)
        </p>
      )}
      <Button block style={{ marginTop: 16 }} disabled={!f.valid || !f.dirty} onClick={f.run}>
        예측해보기
      </Button>
      <div className="micro" style={{ marginTop: 6, textAlign: 'center' }}>
        {f.dirty && f.valid ? '바꾼 가정으로 결과를 다시 계산해요' : '지금 결과는 위 가정 기준이에요'}
      </div>

      <SubBox style={{ marginTop: 18, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>최근 10년 연평균 수익률 (참고)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 12px', fontSize: 13 }}>
          {REF_RETURNS.map((r) => (
            <Fragment key={r.k}>
              <span>{r.k}</span>
              <b>{r.v}</b>
            </Fragment>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 8, lineHeight: 1.5 }}>과거 수익률은 미래를 보장하지 않습니다</div>
      </SubBox>
    </>
  )
}

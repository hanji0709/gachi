import { Icon, IconButton, Segmented, Select } from '../../components/ui'
import { PERIOD_UNITS, type PeriodUnit, type PnlView } from './usePnlView'

const navBtn = {
  width: 36,
  height: 36,
  border: 'none',
  background: 'transparent',
  borderRadius: 10,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const

/** 기간 단위 토글 (모바일은 '사용자 지정'을 '지정'으로 줄여 표시) */
export function UnitToggle({ p, m }: { p: PnlView; m?: boolean }) {
  const short = (u: PeriodUnit) => (m && u === '사용자 지정' ? '지정' : u)
  return (
    <Segmented
      label="기간 단위"
      options={PERIOD_UNITS.map(short)}
      value={short(p.unit)}
      onChange={(v) => p.setUnit(v === '지정' ? '사용자 지정' : (v as PeriodUnit))}
      block={m}
    />
  )
}

/** PC: ‹ 2026-07 ~ 2026-09 › */
export function PeriodNav({ p }: { p: PnlView }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 14, padding: 2 }}>
      <button type="button" aria-label="이전 기간" style={{ ...navBtn, opacity: p.canPrev ? 1 : 0.35 }} disabled={!p.canPrev} onClick={() => p.shift(-1)}>
        <Icon name="chevronLeft" size={18} color="var(--text-sub)" />
      </button>
      <span style={{ fontSize: 14, fontWeight: 600, padding: '0 6px', whiteSpace: 'nowrap' }}>{p.label}</span>
      <button type="button" aria-label="다음 기간" style={{ ...navBtn, opacity: p.canNext ? 1 : 0.35 }} disabled={!p.canNext} onClick={() => p.shift(1)}>
        <Icon name="chevronRight" size={18} color="var(--text-sub)" />
      </button>
    </div>
  )
}

/** 모바일: 가운데 기간 + 양옆 화살표 */
export function MPeriodNav({ p }: { p: PnlView }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <IconButton icon="chevronLeft" label="이전 기간" disabled={!p.canPrev} style={{ opacity: p.canPrev ? 1 : 0.35 }} onClick={() => p.shift(-1)} />
      <b style={{ fontSize: 15 }}>{p.label}</b>
      <IconButton icon="chevronRight" label="다음 기간" disabled={!p.canNext} style={{ opacity: p.canNext ? 1 : 0.35 }} onClick={() => p.shift(1)} />
    </div>
  )
}

/** 사용자 지정: 시작·끝 결산월 선택 */
export function CustomRange({ p, m }: { p: PnlView; m?: boolean }) {
  if (p.unit !== '사용자 지정' || !p.range) return null
  const options = [...p.available].reverse().map((v) => ({ value: v, label: v }))
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: m ? 'nowrap' : 'wrap' }}>
      <Select id="pnl-from" label="시작" hideLabel={!m} value={p.range[0]} onChange={p.setFrom} options={options} style={{ minWidth: 120, flex: m ? 1 : undefined }} />
      <span style={{ color: 'var(--text-sub)', paddingBottom: 12 }}>~</span>
      <Select id="pnl-to" label="끝" hideLabel={!m} value={p.range[1]} onChange={p.setTo} options={options} style={{ minWidth: 120, flex: m ? 1 : undefined }} />
    </div>
  )
}

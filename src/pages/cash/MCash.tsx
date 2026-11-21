import { useState } from 'react'
import { Button, Card, CardHeader, Icon, StatCard } from '../../components/ui'
import { CASH_KIND_LABEL, SAFETY_BALANCE, type CashEvent, type CashModel } from '../../data/cash'
import { formatDelta, formatShort, formatWon } from '../../data/format'
import { AmountInput } from '../settle/parts'
import { BalanceChart } from './BalanceChart'
import { CashTabs, FixedItems, MonthStepper } from './CashParts'
import { PlanCard } from './PcCash'

interface Props {
  cash: CashModel
  month: string
  onMonthChange: (m: string) => void
  tab: 'flow' | 'items'
  onTab: (t: 'flow' | 'items') => void
}

const note = { fontSize: 12, color: 'var(--text-sub)', marginTop: 2 } as const

/** 같은 날 입출금 묶음 */
function DaySection({ day, events }: { day: number; events: CashEvent[] }) {
  const balance = events[events.length - 1].balance
  const danger = balance < SAFETY_BALANCE
  return (
    <div style={{ padding: '4px 0 8px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          borderRadius: 12,
          background: danger ? 'var(--bad-bg)' : 'var(--surface-sub)',
          fontSize: 13,
          fontWeight: 600,
          color: danger ? 'var(--bad)' : 'var(--text)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {danger && <Icon name="warning" size={15} color="var(--bad)" strokeWidth={2} />}
          {day}일
        </span>
        <span>잔액 {formatWon(balance)}원</span>
      </div>
      {events.map((e) => (
        <div key={e.item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--line)', minHeight: 44, boxSizing: 'border-box' }}>
          <span style={{ flex: 1, fontSize: 15, minWidth: 0 }}>
            {e.item.name} <span className="micro">· {CASH_KIND_LABEL[e.item.kind]}</span>
          </span>
          <b style={{ fontSize: 15, color: e.delta > 0 ? 'var(--good)' : 'var(--text)' }}>
            {e.delta > 0 ? '+' : '−'}
            {formatWon(Math.abs(e.delta))}
          </b>
        </div>
      ))}
    </div>
  )
}

export function MCash({ cash, month, onMonthChange, tab, onTab }: Props) {
  const p = cash.projection
  const [editStart, setEditStart] = useState(false)
  const short = p.min < SAFETY_BALANCE
  const byDay = new Map<number, CashEvent[]>()
  for (const e of p.events) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e])

  return (
    <>
      <CashTabs tab={tab} onChange={onTab} count={cash.items.length} m />
      <MonthStepper month={month} onChange={onMonthChange} m />
      {cash.error && (
        <p role="alert" style={{ color: 'var(--bad)', fontWeight: 600 }}>
          {cash.error}
        </p>
      )}

      {tab === 'items' ? (
        <Card pad="md">
          <CardHeader variant="m" title="고정 항목" />
          <FixedItems cash={cash} m />
        </Card>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
            <StatCard
              size="m"
              label="시작 잔액"
              value={formatWon(p.start)}
              footer={
                <button
                  type="button"
                  aria-expanded={editStart}
                  onClick={() => setEditStart((v) => !v)}
                  style={{ display: 'block', marginTop: 2, padding: 0, border: 'none', background: 'transparent', fontSize: 12, color: 'var(--violet-700)', fontWeight: 600 }}
                >
                  {editStart ? '닫기' : '편집'}
                </button>
              }
            />
            <StatCard size="m" label="월말 예상" value={formatWon(p.end)} delta={formatDelta(p.end - p.start)} deltaTone={p.end >= p.start ? 'good' : 'bad'} />
            <StatCard
              size="m"
              label={`최저 잔액${p.minDay ? ` · ${p.minDay}일` : ''}`}
              value={formatWon(p.min)}
              valueColor={short ? 'var(--bad)' : undefined}
              outline={short ? 'bad' : undefined}
              footer={short ? <div style={{ fontSize: 12, color: 'var(--bad)', fontWeight: 600 }}>안전 잔액보다 {formatWon(SAFETY_BALANCE - p.min)} 부족</div> : <div style={note}>안전 잔액 이상</div>}
            />
            <StatCard size="m" label="쓸 수 있는 잉여" value={formatWon(Math.max(0, p.surplus))} footer={<div style={note}>안전 잔액 {formatShort(SAFETY_BALANCE)} 제외</div>} />
          </div>

          {editStart && (
            <Card pad="sm" data-amount-scope="">
              <div className="label" style={{ marginBottom: 8 }}>
                시작 잔액 <span className="micro">· {cash.startIsDefault ? cash.startBasis : '직접 입력한 값'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <AmountInput label="시작 잔액" value={p.start} width="100%" onCommit={(n) => void cash.setStart(n)} />
                {!cash.startIsDefault && (
                  <Button variant="secondary" size="sm" onClick={() => void cash.setStart(null)}>
                    결산값으로
                  </Button>
                )}
              </div>
            </Card>
          )}

          {cash.items.length === 0 ? (
            <Card pad="md" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, marginBottom: 12 }}>매달 반복되는 입출금을 등록하면 날짜별 잔액을 미리 계산해요.</p>
              <Button block onClick={() => onTab('items')}>
                고정 항목 등록하기
              </Button>
            </Card>
          ) : (
            <>
              <Card pad="md">
                <CardHeader variant="m" title="예상 잔액" right={<span style={{ fontSize: 12, color: 'var(--text-sub)' }}>점을 누르면 그날 내역</span>} />
                <BalanceChart proj={p} width={360} height={220} />
              </Card>

              <Card pad="md">
                <CardHeader variant="m" title="날짜별 현금흐름" />
                {[...byDay].map(([day, events]) => (
                  <DaySection key={day} day={day} events={events} />
                ))}
              </Card>

              <PlanCard key={month} cash={cash} m />
            </>
          )}
        </>
      )}
    </>
  )
}

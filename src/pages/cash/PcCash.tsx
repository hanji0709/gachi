import { useState, type ReactNode } from 'react'
import { PageHead } from '../../components/layout/PageHead'
import { Button, Card, CardHeader, Delta, Icon, Label, Money, StackBar } from '../../components/ui'
import { CASH_KIND_COLOR, CASH_KIND_LABEL, PLAN_KEYS, SAFETY_BALANCE, type CashModel, type PlanKey } from '../../data/cash'
import { formatDelta, formatPct, formatShort, formatWon } from '../../data/format'
import { AmountInput } from '../settle/parts'
import { BalanceChart } from './BalanceChart'
import { CashTabs, FixedItems, MonthStepper } from './CashParts'

interface Props {
  cash: CashModel
  month: string
  onMonthChange: (m: string) => void
  tab: 'flow' | 'items'
  onTab: (t: 'flow' | 'items') => void
}

/** 요약 카드 (숫자 26px · 단위 13px) */
function Kpi({ label, value, valueColor, outline, action, children }: { label: ReactNode; value: string; valueColor?: string; outline?: 'bad'; action?: ReactNode; children: ReactNode }) {
  return (
    <Card outline={outline}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 24 }}>
        <Label>{label}</Label>
        {action}
      </div>
      <div style={{ margin: '6px 0 4px' }}>
        <Money value={value} size={26} unitSize={13} color={valueColor} />
      </div>
      {children}
    </Card>
  )
}

const note = { fontSize: 12, color: 'var(--text-sub)' } as const
const linkBtn = { border: 'none', background: 'transparent', color: 'var(--violet-700)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 } as const

export function PcCash({ cash, month, onMonthChange, tab, onTab }: Props) {
  return (
    <>
      <PageHead title="월 현금흐름" desc="고정 수입·지출을 날짜 순서로 쌓아 이번 달 통장 잔액을 미리 봅니다" tools={<MonthStepper month={month} onChange={onMonthChange} />} />
      <CashTabs tab={tab} onChange={onTab} count={cash.items.length} />
      {cash.error && (
        <p role="alert" style={{ color: 'var(--bad)', fontWeight: 600, marginBottom: 16 }}>
          {cash.error}
        </p>
      )}
      {tab === 'items' ? (
        <Card>
          <CardHeader title="고정 항목" />
          <FixedItems cash={cash} />
        </Card>
      ) : (
        <FlowTab cash={cash} month={month} onTab={onTab} />
      )}
    </>
  )
}

function FlowTab({ cash, month, onTab }: { cash: CashModel; month: string; onTab: (t: 'flow' | 'items') => void }) {
  const p = cash.projection
  const [editStart, setEditStart] = useState(false)
  const short = p.min < SAFETY_BALANCE
  const outflow = (['living', 'loan', 'saving'] as const).map((k) => ({ k, value: p.outByKind[k] }))

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 20 }}>
        <Kpi
          label="시작 잔액"
          value={formatWon(p.start)}
          action={
            <button type="button" style={linkBtn} aria-expanded={editStart} onClick={() => setEditStart((v) => !v)}>
              {editStart ? '닫기' : '편집'}
            </button>
          }
        >
          {editStart ? (
            <div data-amount-scope="" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <AmountInput label="시작 잔액" value={p.start} width="100%" onCommit={(n) => void cash.setStart(n)} />
              {!cash.startIsDefault && (
                <button type="button" style={{ ...linkBtn, whiteSpace: 'nowrap' }} onClick={() => void cash.setStart(null)}>
                  결산값으로
                </button>
              )}
            </div>
          ) : (
            <div style={note}>{cash.startIsDefault ? cash.startBasis : '직접 입력한 값'}</div>
          )}
        </Kpi>
        <Kpi label="월말 예상 잔액" value={formatWon(p.end)}>
          <Delta tone={p.end >= p.start ? 'good' : 'bad'} suffix=" 시작 대비">
            {formatDelta(p.end - p.start)}
          </Delta>
        </Kpi>
        <Kpi label="최저 잔액" value={formatWon(p.min)} valueColor={short ? 'var(--bad)' : undefined} outline={short ? 'bad' : undefined}>
          {short ? (
            <div style={{ fontSize: 13, color: 'var(--bad)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="warning" size={16} color="var(--bad)" strokeWidth={2} />
              {p.minDay ? `${p.minDay}일 · ` : ''}안전 잔액보다 {formatWon(SAFETY_BALANCE - p.min)}원 부족
            </div>
          ) : (
            <div style={note}>{p.minDay ? `${p.minDay}일 · ` : ''}안전 잔액 {formatShort(SAFETY_BALANCE)} 이상</div>
          )}
        </Kpi>
        <Kpi label="쓸 수 있는 잉여" value={formatWon(Math.max(0, p.surplus))}>
          <div style={note}>월말 예상 − 안전 잔액 {formatShort(SAFETY_BALANCE)}</div>
        </Kpi>
      </div>

      {cash.items.length === 0 ? (
        <Card style={{ marginTop: 20, textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 15, marginBottom: 12 }}>매달 반복되는 입출금을 등록하면 날짜별 잔액을 미리 계산해요.</p>
          <Button onClick={() => onTab('items')}>고정 항목 등록하기</Button>
        </Card>
      ) : (
        <>
          <Card style={{ padding: 20, marginTop: 20 }}>
            <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>총 유입</span> <b style={{ color: 'var(--good)', fontSize: 16 }}>+{formatWon(p.inflow)}원</b>
              </div>
              <div>
                <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>총 유출</span> <b style={{ fontSize: 16 }}>−{formatWon(p.outflow)}원</b>
              </div>
              <div style={{ flex: 1, minWidth: 320 }}>
                <StackBar height={12} segments={outflow.map((o) => ({ value: o.value, color: CASH_KIND_COLOR[o.k] }))} />
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-sub)', marginTop: 6 }}>
                  {outflow.map((o) => (
                    <span key={o.k}>
                      {CASH_KIND_LABEL[o.k]} {formatPct(p.outflow > 0 ? o.value / p.outflow : 0, 0)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card style={{ marginTop: 20 }}>
            <CardHeader title="예상 잔액 추이" right={<span style={note}>점에 올리면 그날 내역이 보여요</span>} />
            <BalanceChart proj={p} width={1100} height={280} />
          </Card>

          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', marginTop: 20 }}>
            <div style={{ flex: '999 1 640px', minWidth: 0 }}>
              <Card>
                <CardHeader title="날짜별 현금흐름" right={<button type="button" style={linkBtn} onClick={() => onTab('items')}>고정 항목 편집</button>} />
                <FlowTable cash={cash} />
              </Card>
            </div>
            <div style={{ flex: '1 1 340px', minWidth: 0 }}>
              <PlanCard key={month} cash={cash} />
            </div>
          </div>
        </>
      )}
    </>
  )
}

/** 날짜별 현금흐름 표 (안전 잔액 아래로 내려가는 행은 빨강) */
function FlowTable({ cash }: { cash: CashModel }) {
  const p = cash.projection
  const bad = { color: 'var(--bad)' }
  return (
    <div className="table-box">
      <table className="table">
        <caption className="sr-only">날짜별 현금흐름</caption>
        <thead>
          <tr>
            <th scope="col">날짜</th>
            <th scope="col">내용</th>
            <th scope="col">종류</th>
            <th scope="col" style={{ textAlign: 'right' }}>
              변동
            </th>
            <th scope="col" style={{ textAlign: 'right' }}>
              잔액
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="strong">시작</td>
            <td>시작 잔액</td>
            <td />
            <td />
            <td className="strong num">{formatWon(p.start)}원</td>
          </tr>
          {p.events.map((e) => {
            const danger = e.balance < SAFETY_BALANCE
            return (
              <tr key={e.item.id} style={danger ? { background: 'var(--bad-bg)' } : undefined}>
                <td className="strong" style={danger ? bad : undefined}>
                  {e.day}일
                </td>
                <td>{e.item.name}</td>
                <td style={{ color: 'var(--text-sub)' }}>{CASH_KIND_LABEL[e.item.kind]}</td>
                <td className="strong num" style={e.delta > 0 ? { color: 'var(--good)' } : undefined}>
                  {e.delta > 0 ? '+' : '−'}
                  {formatWon(Math.abs(e.delta))}원
                </td>
                <td className="strong num" style={danger ? bad : undefined}>
                  {formatWon(e.balance)}원
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const PLAN_COLOR: Record<PlanKey, string> = { 비상금: 'var(--violet-300)', 저축: 'var(--violet-500)', 투자: 'var(--violet-700)', '추가 상환': 'var(--cyan-500)' }

/** 잉여 현금 배분 계획 (달마다 저장) */
export function PlanCard({ cash, m }: { cash: CashModel; m?: boolean }) {
  const [plan, setPlan] = useState<Partial<Record<PlanKey, number>>>(cash.plan)
  const [saved, setSaved] = useState(false)
  const surplus = Math.max(0, cash.projection.surplus)
  const used = PLAN_KEYS.reduce((s, k) => s + (plan[k] ?? 0), 0)
  const left = surplus - used
  return (
    <Card pad={m ? 'md' : undefined}>
      <CardHeader variant={m ? 'm' : undefined} title="잉여 현금 배분 계획" />
      <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 12 }}>
        쓸 수 있는 잉여 <b style={{ color: 'var(--text)' }}>{formatWon(surplus)}원</b>
      </div>
      <StackBar height={12} segments={[...PLAN_KEYS.map((k) => ({ value: plan[k] ?? 0, color: PLAN_COLOR[k] })), { value: Math.max(0, left), color: 'var(--surface-sub)' }]} />
      <div data-amount-scope="">
        {PLAN_KEYS.map((k) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <span className="legend__swatch" style={{ background: PLAN_COLOR[k] }} />
            <span style={{ flex: 1, fontSize: 14 }}>{k}</span>
            <AmountInput
              label={`${k} 배분액`}
              value={plan[k]}
              width={140}
              onCommit={(n) => {
                setPlan((p) => ({ ...p, [k]: n }))
                setSaved(false)
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 14 }}>
        <span style={{ color: 'var(--text-sub)' }}>남은 금액</span>
        <b style={{ color: left < 0 ? 'var(--bad)' : undefined }}>{formatWon(left)}원</b>
      </div>
      <div style={{ marginTop: 16 }}>
        <Button
          block
          onClick={() =>
            void cash.savePlan(plan).then(() => {
              setSaved(true)
            })
          }
        >
          {saved ? '저장됨' : '계획 저장'}
        </Button>
      </div>
    </Card>
  )
}

import { useState, type FormEvent } from 'react'
import { Badge, Button, Icon, IconButton, Select, TextField } from '../../components/ui'
import { CASH_KIND_LABEL, CASH_KINDS, type CashKind, type CashModel } from '../../data/cash'
import { addMonths, parseAmount, splitMonth } from '../../data/format'
import { AmountInput } from '../settle/parts'

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}일` }))
const KIND_OPTIONS = CASH_KINDS.map((k) => ({ value: k, label: CASH_KIND_LABEL[k] }))
export const KIND_TONE: Record<CashKind, 'good' | 'info' | 'neutral' | 'warn'> = { income: 'good', living: 'neutral', loan: 'info', saving: 'warn' }

/** ‹ 2026년 11월 › (PC 상자형 · 모바일 양옆 화살표) */
export function MonthStepper({ month, onChange, m }: { month: string; onChange: (m: string) => void; m?: boolean }) {
  const { year, month: mm } = splitMonth(month)
  const label = `${year}년 ${mm}월`
  if (m) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="chevronLeft" label="이전 달" iconSize={22} onClick={() => onChange(addMonths(month, -1))} />
        <b style={{ fontSize: 15 }}>{label}</b>
        <IconButton icon="chevronRight" label="다음 달" iconSize={22} onClick={() => onChange(addMonths(month, 1))} />
      </div>
    )
  }
  const btn = { width: 36, height: 36, border: 'none', background: 'transparent', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } as const
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 14, padding: 2 }}>
      <button type="button" aria-label="이전 달" style={btn} onClick={() => onChange(addMonths(month, -1))}>
        <Icon name="chevronLeft" size={18} color="var(--text-sub)" />
      </button>
      <span style={{ fontSize: 14, fontWeight: 600, padding: '0 6px', whiteSpace: 'nowrap' }}>{label}</span>
      <button type="button" aria-label="다음 달" style={btn} onClick={() => onChange(addMonths(month, 1))}>
        <Icon name="chevronRight" size={18} color="var(--text-sub)" />
      </button>
    </div>
  )
}

/** 탭 (현금흐름 · 고정 항목) */
export function CashTabs({ tab, onChange, count, m }: { tab: 'flow' | 'items'; onChange: (t: 'flow' | 'items') => void; count: number; m?: boolean }) {
  const tabs = [
    ['flow', '현금흐름'],
    ['items', `고정 항목 ${count}`],
  ] as const
  return (
    <div role="tablist" className={m ? 'pill-tabs' : 'tabs'} style={m ? undefined : { gap: 28, marginBottom: 24 }}>
      {tabs.map(([k, label]) => (
        <button key={k} type="button" role="tab" aria-selected={tab === k} className={m ? 'pill-tabs__tab' : 'tabs__tab'} onClick={() => onChange(k)}>
          {label}
        </button>
      ))}
    </div>
  )
}

/** 고정 항목 추가 양식 */
function AddItemForm({ cash, m }: { cash: CashModel; m?: boolean }) {
  const [name, setName] = useState('')
  const [day, setDay] = useState('25')
  const [kind, setKind] = useState<CashKind>('living')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const n = parseAmount(amount)
    if (!name.trim()) return setError('내용을 입력해 주세요')
    if (n === null || n <= 0) return setError('금액을 숫자로 입력해 주세요')
    setBusy(true)
    setError(null)
    await cash.addItem({ name, day: Number(day), kind, amount: n })
    setBusy(false)
    setName('')
    setAmount('')
  }
  return (
    <form
      onSubmit={submit}
      noValidate
      style={{
        display: 'grid',
        gridTemplateColumns: m ? '1fr 1fr' : '2fr 0.8fr 1fr 1.2fr auto',
        gap: 12,
        alignItems: 'end',
        padding: m ? 14 : 16,
        marginBottom: 16,
        borderRadius: 14,
        background: 'var(--surface-sub)',
      }}
    >
      <div style={m ? { gridColumn: '1 / -1' } : undefined}>
        <TextField id="cash-name" label="내용" value={name} onChange={setName} maxLength={40} placeholder="예: IBK 주담대" />
      </div>
      <Select id="cash-day" label="매달" value={day} onChange={setDay} options={DAY_OPTIONS} />
      <Select id="cash-kind" label="종류" value={kind} onChange={(v) => setKind(v as CashKind)} options={KIND_OPTIONS} />
      <div style={m ? { gridColumn: '1 / -1' } : undefined}>
        <TextField id="cash-amount" label="금액(원)" value={amount} onChange={setAmount} placeholder="예: 950,000" />
      </div>
      <Button type="submit" disabled={busy} block={m} style={m ? { gridColumn: '1 / -1' } : undefined}>
        {busy ? '추가 중…' : '추가'}
      </Button>
      {error && (
        <p role="alert" style={{ gridColumn: '1 / -1', margin: 0, fontSize: 13, color: 'var(--bad)', fontWeight: 600 }}>
          {error}
        </p>
      )}
    </form>
  )
}

/** 고정 항목 탭: 매달 반복되는 입출금 목록 (추가 · 날짜/종류/금액 수정 · 삭제) */
export function FixedItems({ cash, m }: { cash: CashModel; m?: boolean }) {
  const list = [...cash.items].sort((a, b) => a.day - b.day || a.sortOrder - b.sortOrder)
  return (
    <div data-amount-scope="">
      <p className="micro" style={{ margin: '0 0 12px' }}>
        매달 같은 날 반복되는 수입·지출을 등록하면 현금흐름 탭에서 날짜 순서로 잔액을 미리 계산해요. 말일보다 큰 날짜는 그 달 말일로 계산해요.
      </p>
      <AddItemForm cash={cash} m={m} />
      {list.length === 0 ? (
        <p className="caption" style={{ padding: '24px 0', textAlign: 'center' }}>
          아직 고정 항목이 없어요. 위에서 추가해 주세요.
        </p>
      ) : m ? (
        <div>
          {list.map((it) => (
            <div key={it.id} style={{ padding: '12px 0', borderTop: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge tone={KIND_TONE[it.kind]}>{CASH_KIND_LABEL[it.kind]}</Badge>
                <b style={{ flex: 1, fontSize: 15, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</b>
                <IconButton icon="close" label={`${it.name} 삭제`} iconSize={18} onClick={() => void cash.removeItem(it.id)} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <Select id={`cash-d-${it.id}`} label="날짜" hideLabel value={String(it.day)} onChange={(v) => void cash.updateItem(it.id, { day: Number(v) })} options={DAY_OPTIONS} style={{ width: 96 }} />
                <Select id={`cash-k-${it.id}`} label="종류" hideLabel value={it.kind} onChange={(v) => void cash.updateItem(it.id, { kind: v as CashKind })} options={KIND_OPTIONS} style={{ width: 120 }} />
                <AmountInput label={`${it.name} 금액`} value={it.amount} width="100%" onCommit={(n) => void cash.updateItem(it.id, { amount: n })} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-box">
          <table className="table">
            <caption className="sr-only">고정 항목 목록</caption>
            <thead>
              <tr>
                <th scope="col">매달</th>
                <th scope="col">내용</th>
                <th scope="col">종류</th>
                <th scope="col" style={{ textAlign: 'right' }}>
                  금액
                </th>
                <th scope="col" style={{ width: 48 }}>
                  <span className="sr-only">삭제</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((it) => (
                <tr key={it.id}>
                  <td style={{ width: 110 }}>
                    <Select id={`cash-d-${it.id}`} label={`${it.name} 날짜`} hideLabel value={String(it.day)} onChange={(v) => void cash.updateItem(it.id, { day: Number(v) })} options={DAY_OPTIONS} />
                  </td>
                  <td className="strong">{it.name}</td>
                  <td style={{ width: 150 }}>
                    <Select id={`cash-k-${it.id}`} label={`${it.name} 종류`} hideLabel value={it.kind} onChange={(v) => void cash.updateItem(it.id, { kind: v as CashKind })} options={KIND_OPTIONS} />
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 16px' }}>
                    <AmountInput label={`${it.name} 금액`} value={it.amount} onCommit={(n) => void cash.updateItem(it.id, { amount: n })} />
                  </td>
                  <td>
                    <IconButton icon="close" label={`${it.name} 삭제`} iconSize={18} onClick={() => void cash.removeItem(it.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

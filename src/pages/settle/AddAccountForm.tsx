import { useState, type FormEvent } from 'react'
import { Button, Segmented, Select, TextField } from '../../components/ui'
import { parseRate } from '../../data/format'
import { ASSET_CATEGORIES, LIABILITY_CATEGORIES, OWNER_LABEL, type AccountKind, type AccountOwner, type NewAccount } from '../../data/ledger'

interface Props {
  /** 처음 선택된 종류 (PC는 탭에서 정해짐) */
  kind: AccountKind
  onAdd: (a: NewAccount) => Promise<void>
  /** pc = 한 줄 배치(탭이 종류를 정함) · m = 세로 배치 + 자산/부채 선택 + 취소 */
  layout?: 'pc' | 'm'
  onCancel?: () => void
}

/** 자산·부채 추가 양식 (월별 결산 PC·모바일 공용) */
export function AddAccountForm({ kind: initialKind, onAdd, layout = 'pc', onCancel }: Props) {
  const m = layout === 'm'
  const [kind, setKind] = useState<AccountKind>(initialKind)
  const categories = kind === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>(categories[0])
  const [owner, setOwner] = useState<AccountOwner>('joint')
  const [rate, setRate] = useState('')
  const [busy, setBusy] = useState(false)
  const rateValue = rate.trim() === '' ? null : parseRate(rate)
  const rateInvalid = kind === 'liability' && rate.trim() !== '' && rateValue === null
  // PC는 탭이 바뀌면 종류도 따라감
  const effectiveKind = m ? kind : initialKind
  const cats = effectiveKind === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES
  const validCategory = (cats as readonly string[]).includes(category) ? category : cats[0]

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || rateInvalid) return
    setBusy(true)
    await onAdd({
      kind: effectiveKind,
      name,
      category: validCategory,
      owner,
      interestRate: effectiveKind === 'liability' ? rateValue : null,
    })
    setBusy(false)
  }

  const fields = (
    <>
      <TextField
        id="acc-name"
        label={effectiveKind === 'asset' ? '자산 이름' : '부채 이름'}
        value={name}
        onChange={setName}
        maxLength={40}
        placeholder={effectiveKind === 'asset' ? '예: 생활비 통장' : '예: 주택담보대출'}
        required
        autoFocus
      />
      <Select id="acc-cat" label="카테고리" value={validCategory} onChange={setCategory} options={cats.map((c) => ({ value: c, label: c }))} />
      <Select
        id="acc-owner"
        label="소유자"
        value={owner}
        onChange={(v) => setOwner(v as AccountOwner)}
        options={(['joint', 'husband', 'wife'] as const).map((o) => ({ value: o, label: OWNER_LABEL[o] }))}
      />
      {effectiveKind === 'liability' && (
        <TextField id="acc-rate" label="금리(%)" value={rate} onChange={setRate} placeholder="예: 3.9" error={rateInvalid ? '숫자로 입력해 주세요' : undefined} />
      )}
    </>
  )

  if (!m) {
    return (
      <form
        onSubmit={submit}
        style={{
          display: 'grid',
          gridTemplateColumns: effectiveKind === 'liability' ? '2fr 1.4fr 1fr 1fr auto' : '2fr 1.4fr 1fr auto',
          gap: 12,
          alignItems: 'end',
          padding: 16,
          marginBottom: 16,
          borderRadius: 14,
          background: 'var(--surface-sub)',
        }}
      >
        {fields}
        <Button type="submit" disabled={busy || !name.trim() || rateInvalid}>
          {busy ? '추가 중…' : '추가'}
        </Button>
      </form>
    )
  }

  return (
    <form
      onSubmit={submit}
      style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, margin: '8px 0 12px', borderRadius: 14, background: 'var(--surface-sub)' }}
    >
      <Segmented
        label="종류"
        block
        size="sm"
        options={['자산', '부채']}
        value={kind === 'asset' ? '자산' : '부채'}
        onChange={(v) => {
          const next: AccountKind = v === '부채' ? 'liability' : 'asset'
          setKind(next)
          setCategory((next === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES)[0])
        }}
      />
      {fields}
      <div style={{ display: 'flex', gap: 8 }}>
        {onCancel && (
          <Button type="button" variant="secondary" block onClick={onCancel}>
            취소
          </Button>
        )}
        <Button type="submit" block disabled={busy || !name.trim() || rateInvalid}>
          {busy ? '추가 중…' : '추가'}
        </Button>
      </div>
    </form>
  )
}

import { useState, type CSSProperties, type ClipboardEvent, type KeyboardEvent } from 'react'
import { Icon } from '../../components/ui'
import { formatNumber, parseAmount, parseRate } from '../../data/format'
import type { SaveState } from '../../data/useSettlement'

/** 같은 표 안 다음 입력칸으로 이동·붙여넣기를 위해 입력칸별 저장 함수를 기억 */
const commitRegistry = new WeakMap<HTMLInputElement, (text: string) => void>()

function amountInputs(from: HTMLInputElement): HTMLInputElement[] {
  const scope = from.closest('[data-amount-scope]') ?? document
  return Array.from(scope.querySelectorAll<HTMLInputElement>('input[data-amount]')).filter((el) => !el.disabled)
}

interface AmountInputProps {
  label: string
  /** 저장된 값 (없으면 빈칸) */
  value: number | undefined
  onCommit: (value: number) => void
  disabled?: boolean
  /** 환율처럼 소수 둘째 자리까지 */
  decimal?: boolean
  width?: number | string
  style?: CSSProperties
}

/**
 * 표 안 금액 입력칸 (단위 없음, 오른쪽 정렬)
 * - 입력 중에는 숫자만, 벗어나면 쉼표 표기
 * - 칸을 벗어나거나 Enter를 누르면 저장, Enter는 다음 칸으로 이동
 * - 엑셀에서 세로로 여러 칸을 복사해 붙여넣으면 아래 칸들에 차례로 채움
 */
export function AmountInput({ label, value, onCommit, disabled, decimal, width = 140, style }: AmountInputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const parse = decimal ? parseRate : parseAmount
  const shown = draft ?? (value === undefined ? '' : formatNumber(value, decimal ? 2 : 0))

  const commitText = (text: string) => {
    // 원래 비어 있던 칸을 거치기만 했으면 저장하지 않음 (0원으로 저장되는 것 방지)
    if (text.trim() === '' && value === undefined) {
      setInvalid(false)
      setDraft(null)
      return true
    }
    const n = parse(text)
    if (n === null) {
      setInvalid(true)
      return false
    }
    setInvalid(false)
    setDraft(null)
    if (n !== value) onCommit(n)
    return true
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const el = e.currentTarget
      if (!commitText(el.value)) return
      const list = amountInputs(el)
      list[list.indexOf(el) + 1]?.focus()
    }
    if (e.key === 'Escape') {
      setDraft(null)
      setInvalid(false)
      e.currentTarget.blur()
    }
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    const cells = text.split(/\r?\n|\t/).map((s) => s.trim()).filter((s) => s !== '')
    if (cells.length < 2) return // 한 칸짜리는 기본 붙여넣기
    e.preventDefault()
    const list = amountInputs(e.currentTarget)
    const start = list.indexOf(e.currentTarget)
    cells.forEach((cell, i) => {
      const target = list[start + i]
      if (target) commitRegistry.get(target)?.(cell)
    })
  }

  return (
    <input
      ref={(el) => {
        if (el) commitRegistry.set(el, (t) => void commitText(t))
      }}
      data-amount=""
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      aria-label={label}
      aria-invalid={invalid || undefined}
      title={invalid ? '숫자만 입력할 수 있어요' : undefined}
      value={shown}
      disabled={disabled}
      placeholder="0"
      onFocus={(e) => {
        setDraft(value === undefined ? '' : String(value))
        requestAnimationFrame(() => e.target.select())
      }}
      onChange={(e) => {
        setDraft(e.target.value)
        if (invalid) setInvalid(false)
      }}
      onBlur={(e) => {
        if (!commitText(e.target.value)) return
      }}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      style={{
        width,
        minHeight: 36,
        borderRadius: 10,
        border: invalid ? '2px solid var(--bad)' : '1px solid var(--line-strong)',
        padding: invalid ? '0 9px' : '0 10px',
        textAlign: 'right',
        fontSize: 14,
        fontVariantNumeric: 'tabular-nums',
        color: disabled ? 'var(--text-sub)' : 'var(--text)',
        background: disabled ? 'var(--surface-sub)' : 'var(--surface)',
        ...style,
      }}
    />
  )
}

export const DIFF_COLOR = {
  good: 'var(--good)',
  bad: 'var(--bad)',
  neutral: 'var(--text-sub)',
} as const

/** 저장 상태 표시 */
export function SaveStatus({ save }: { save: SaveState }) {
  if (save.kind === 'idle') return null
  if (save.kind === 'saving') return <span aria-live="polite">저장 중…</span>
  if (save.kind === 'error')
    return (
      <span role="alert" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--bad)', fontWeight: 600 }}>
        <Icon name="warning" size={16} color="var(--bad)" strokeWidth={2} />
        {save.message}
      </span>
    )
  return (
    <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Icon name="check" size={16} color="var(--good)" strokeWidth={2} />
      저장됨
    </span>
  )
}

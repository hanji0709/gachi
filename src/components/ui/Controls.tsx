import { useState, type CSSProperties, type ReactNode } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'

/* ───────── 세그먼트 토글 ───────── */
interface SegmentedProps {
  options: string[]
  /** 처음 선택된 항목 (value를 주지 않을 때의 로컬 상태) */
  defaultValue?: string
  /** 선택 값을 밖에서 관리할 때 */
  value?: string
  onChange?: (value: string) => void
  label: string
  size?: 'md' | 'sm'
  block?: boolean
  style?: CSSProperties
}

export function Segmented({ options, defaultValue, value: controlled, onChange, label, size = 'md', block, style }: SegmentedProps) {
  const [local, setLocal] = useState(defaultValue ?? options[0])
  const value = controlled ?? local
  const setValue = (v: string) => {
    if (controlled === undefined) setLocal(v)
    onChange?.(v)
  }
  return (
    <div
      role="group"
      aria-label={label}
      className={cx('segmented', size === 'sm' && 'segmented--sm', block && 'segmented--block')}
      style={style}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          aria-pressed={opt === value}
          className="segmented__btn"
          onClick={() => setValue(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

/* ───────── 소유자 ───────── */
export type Owner = '공동' | '남편' | '아내'

export const OWNER_COLOR: Record<Owner, string> = {
  공동: 'var(--owner-joint)',
  남편: 'var(--owner-husband)',
  아내: 'var(--owner-wife)',
}

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <span className="dot" style={{ background: color, width: size, height: size }} />
}

/** 표·목록 안 소유자 표시 (점 + 이름) */
export function OwnerTag({ owner }: { owner: Owner }) {
  return (
    <span className="owner">
      <Dot color={OWNER_COLOR[owner]} />
      {owner}
    </span>
  )
}

interface OwnerChipsProps {
  defaultSelected?: Owner[]
  /** 선택 값을 밖에서 관리할 때 */
  value?: Owner[]
  onChange?: (value: Owner[]) => void
  variant?: 'pc' | 'm'
  /** 모바일 가로 스크롤 줄에 바로 넣을 때 래퍼 없이 칩만 렌더 */
  bare?: boolean
}

/** 소유자 필터 (여러 개 선택) */
export function OwnerChips({ defaultSelected = ['공동', '남편', '아내'], value, onChange, variant = 'pc', bare }: OwnerChipsProps) {
  const [local, setLocal] = useState<Owner[]>(defaultSelected)
  const selected = value ?? local
  const toggle = (o: Owner) => {
    const next = selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]
    if (value === undefined) setLocal(next)
    onChange?.(next)
  }
  const chips = (['공동', '남편', '아내'] as Owner[]).map((o) => (
    <button
      key={o}
      type="button"
      aria-pressed={selected.includes(o)}
      className={cx('chip-toggle', variant === 'm' && 'chip-toggle--m')}
      onClick={() => toggle(o)}
    >
      <Dot color={OWNER_COLOR[o]} />
      {o}
    </button>
  ))
  if (bare) return <>{chips}</>
  return (
    <div role="group" aria-label="소유자 필터" className="owner-chips">
      {chips}
    </div>
  )
}

/** 단일 선택 칩 묶음 (예: 빠른 입력 항목, 카테고리 필터) */
export function ChoiceChips({ options, defaultValue, label }: { options: string[]; defaultValue?: string; label: string }) {
  const [value, setValue] = useState(defaultValue ?? options[0])
  return (
    <div role="group" aria-label={label} style={{ display: 'contents' }}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={o === value}
          className="chip-toggle chip-toggle--m"
          style={{ fontWeight: 600, color: 'var(--text)' }}
          onClick={() => setValue(o)}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

/* ───────── 배지 · 칩 ───────── */
export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'info' | 'good' | 'bad' | 'warn'; children: ReactNode }) {
  return <span className={cx('badge', `badge--${tone}`)}>{children}</span>
}

export function InfoChip({ children, neutral }: { children: ReactNode; neutral?: boolean }) {
  return <span className={cx('info-chip', neutral && 'info-chip--neutral')}>{children}</span>
}

/* ───────── 스위치 ───────── */
interface SwitchProps {
  label: ReactNode
  defaultChecked?: boolean
  /** 켜짐 상태를 밖에서 관리할 때 */
  checked?: boolean
  onChange?: (checked: boolean) => void
  style?: CSSProperties
}

export function Switch({ label, defaultChecked = false, checked, onChange, style }: SwitchProps) {
  return (
    <label className="switch" style={style}>
      <input
        type="checkbox"
        role="switch"
        {...(checked === undefined ? { defaultChecked } : { checked })}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
      {label}
    </label>
  )
}

/* ───────── 탭 ───────── */
interface TabsProps {
  tabs: string[]
  defaultValue?: string
  /** underline = 밑줄형(PC), pill = 흰 상자 안 알약형(모바일) */
  variant?: 'underline' | 'pill'
  style?: CSSProperties
}

export function Tabs({ tabs, defaultValue, variant = 'underline', style }: TabsProps) {
  const [value, setValue] = useState(defaultValue ?? tabs[0])
  const pill = variant === 'pill'
  return (
    <div role="tablist" className={pill ? 'pill-tabs' : 'tabs'} style={style}>
      {tabs.map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={t === value}
          className={pill ? 'pill-tabs__tab' : 'tabs__tab'}
          onClick={() => setValue(t)}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

/* ───────── 글자 입력창 (이메일·비밀번호·이름 등) ───────── */
interface TextFieldProps {
  id: string
  label: ReactNode
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email' | 'password'
  autoComplete?: string
  placeholder?: string
  help?: ReactNode
  error?: ReactNode
  required?: boolean
  minLength?: number
  maxLength?: number
  autoFocus?: boolean
  /** 초대 코드처럼 대문자로 보이게 */
  uppercase?: boolean
}

export function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  placeholder,
  help,
  error,
  required,
  minLength,
  maxLength,
  autoFocus,
  uppercase,
}: TextFieldProps) {
  const helpId = `${id}-help`
  return (
    <div className="field">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className={cx('field__control', Boolean(error) && 'field__control--error')}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error || help ? helpId : undefined}
          className="field__input field__input--left"
          style={uppercase ? { textTransform: 'uppercase', letterSpacing: '0.12em' } : undefined}
        />
      </div>
      {error ? (
        <span id={helpId} className="field__help field__help--error">
          {error}
        </span>
      ) : (
        help && (
          <span id={helpId} className="field__help">
            {help}
          </span>
        )
      )}
    </div>
  )
}

/* ───────── 선택 상자 ───────── */
interface SelectProps {
  id: string
  label: ReactNode
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  /** 레이블을 화면에서 숨김 (표 안 등) */
  hideLabel?: boolean
  style?: CSSProperties
}

export function Select({ id, label, value, onChange, options, hideLabel, style }: SelectProps) {
  return (
    <div className="field" style={style}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'label'}>
        {label}
      </label>
      <div className="field__control select">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="select__input">
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={16} color="var(--text-sub)" style={{ pointerEvents: 'none', marginLeft: -22 }} />
      </div>
    </div>
  )
}

/* ───────── 금액 입력창 ───────── */
interface MoneyFieldProps {
  id: string
  label?: ReactNode
  defaultValue?: string
  unit?: string
  help?: ReactNode
  error?: ReactNode
  disabled?: boolean
  size?: 'md' | 'sm'
  align?: 'right' | 'left'
  placeholder?: string
  style?: CSSProperties
}

/** 금액 입력창: 오른쪽 정렬, 단위는 입력창 안 오른쪽, 레이블은 위, 오류는 아래 빨강 */
export function MoneyField({
  id,
  label,
  defaultValue = '',
  unit = '원',
  help,
  error,
  disabled,
  size = 'md',
  align = 'right',
  placeholder,
  style,
}: MoneyFieldProps) {
  return (
    <div className="field" style={style}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <div
        className={cx(
          'field__control',
          size === 'sm' && 'field__control--sm',
          Boolean(error) && 'field__control--error',
          disabled && 'field__control--disabled',
        )}
      >
        <input
          id={id}
          type="text"
          inputMode={align === 'right' ? 'numeric' : undefined}
          defaultValue={defaultValue}
          disabled={disabled}
          placeholder={placeholder}
          className={cx('field__input', align === 'left' && 'field__input--left')}
          style={disabled ? { color: 'var(--text-sub)' } : undefined}
        />
        {unit && <span className="field__unit">{unit}</span>}
      </div>
      {error ? <span className="field__help field__help--error">{error}</span> : help && <span className="field__help">{help}</span>}
    </div>
  )
}

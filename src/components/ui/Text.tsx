import type { CSSProperties, ReactNode } from 'react'
import { cx } from './cx'

export type Tone = 'good' | 'bad' | 'warn' | 'neutral'

interface MoneyProps {
  /** 이미 포맷된 숫자 문자열 (예: "2,071,480,245") */
  value: ReactNode
  /** 숫자 글자 크기(px) */
  size?: number
  /** 단위 글자 크기(px). 기본은 숫자 크기의 절반 정도 */
  unitSize?: number
  unit?: string
  weight?: 400 | 600 | 700
  color?: string
  style?: CSSProperties
}

/** 금액 표기: 숫자 + 한 단계 작은 보조색 "원" */
export function Money({ value, size = 15, unitSize, unit = '원', weight = 600, color, style }: MoneyProps) {
  return (
    <span className="money" style={{ fontSize: size, lineHeight: 1.25, fontWeight: weight, color, ...style }}>
      {value}
      {unit && (
        <span className="money__unit" style={{ fontSize: unitSize ?? Math.max(12, Math.round(size / 2)) }}>
          {unit}
        </span>
      )}
    </span>
  )
}

interface DeltaProps {
  tone: Tone
  /** 예: "▲ +12,480,000원" */
  children: ReactNode
  /** 예: " 전월 대비" — 보조색으로 붙음 */
  suffix?: ReactNode
  size?: number
  style?: CSSProperties
}

/** 증감 표시: 화살표 + 부호 + 금액, 색은 좋음/나쁨 의미색 */
export function Delta({ tone, children, suffix, size = 13, style }: DeltaProps) {
  return (
    <span className={cx('delta', `delta--${tone}`)} style={{ fontSize: size, ...style }}>
      {children}
      {suffix && <span className="delta__suffix">{suffix}</span>}
    </span>
  )
}

export function Label({ children, style, as: Tag = 'div' }: { children: ReactNode; style?: CSSProperties; as?: 'div' | 'span' }) {
  return (
    <Tag className="label" style={style}>
      {children}
    </Tag>
  )
}

export function Caption({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span className="caption" style={style}>
      {children}
    </span>
  )
}

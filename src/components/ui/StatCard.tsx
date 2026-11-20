import type { ReactNode } from 'react'
import { Card } from './Card'
import { Delta, Money, type Tone } from './Text'

interface StatCardProps {
  label: ReactNode
  value: ReactNode
  /** pc = 28px, pcLg = 32px(강조), m = 17px(모바일 2열) */
  size?: 'pc' | 'pcLg' | 'm'
  unit?: string
  valueColor?: string
  delta?: ReactNode
  deltaTone?: Tone
  deltaSuffix?: ReactNode
  /** 증감 대신/아래에 붙는 자유 영역 */
  footer?: ReactNode
  outline?: 'primary' | 'bad'
}

const SIZES = {
  pc: { num: 28, unit: 14, pad: 'lg' as const, gap: '6px 0 4px', delta: 13 },
  pcLg: { num: 32, unit: 16, pad: 'lg' as const, gap: '6px 0 4px', delta: 13 },
  m: { num: 17, unit: 12, pad: 'sm' as const, gap: '4px 0 2px', delta: 12 },
}

/** 요약 카드: 레이블 → 핵심 숫자 → 전월 대비 증감 */
export function StatCard({
  label,
  value,
  size = 'pc',
  unit = '원',
  valueColor,
  delta,
  deltaTone = 'neutral',
  deltaSuffix,
  footer,
  outline,
}: StatCardProps) {
  const s = SIZES[size]
  return (
    <Card pad={s.pad} outline={outline}>
      <div className="label">{label}</div>
      <div style={{ margin: s.gap }}>
        <Money value={value} size={s.num} unitSize={s.unit} unit={unit} color={valueColor} />
      </div>
      {delta && (
        <Delta tone={deltaTone} suffix={deltaSuffix} size={s.delta}>
          {delta}
        </Delta>
      )}
      {footer}
    </Card>
  )
}

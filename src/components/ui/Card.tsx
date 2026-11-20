import type { CSSProperties, ReactNode } from 'react'
import { cx } from './cx'

interface CardProps {
  children: ReactNode
  /** lg = 24px(PC), md = 16px(모바일 카드), sm = 14px(모바일 요약 카드), flush = 0 */
  pad?: 'lg' | 'md' | 'sm' | 'flush'
  /** 강조 테두리: primary(순자산 등) · bad(경고) */
  outline?: 'primary' | 'bad'
  /** 진한 바이올렛 배경(모바일 순자산 히어로) */
  hero?: boolean
  className?: string
  style?: CSSProperties
  as?: 'section' | 'div' | 'article'
  'aria-label'?: string
}

export function Card({ children, pad = 'lg', outline, hero, className, style, as: Tag = 'section', ...rest }: CardProps) {
  return (
    <Tag
      className={cx(
        'card',
        pad !== 'lg' && `card--${pad}`,
        outline && `card--${outline}-outline`,
        hero && 'card--hero',
        className,
      )}
      style={style}
      aria-label={rest['aria-label']}
    >
      {children}
    </Tag>
  )
}

interface CardHeaderProps {
  title: ReactNode
  right?: ReactNode
  /** m = 모바일(제목 17px, 아래 여백 12px) */
  variant?: 'pc' | 'm'
  as?: 'h2' | 'h3'
  style?: CSSProperties
}

export function CardHeader({ title, right, variant = 'pc', as: Tag = 'h2', style }: CardHeaderProps) {
  return (
    <div className={cx('card-header', variant === 'm' && 'card-header--m')} style={style}>
      <Tag className="card-title">{title}</Tag>
      {right}
    </div>
  )
}

export function SubBox({ children, m, style }: { children: ReactNode; m?: boolean; style?: CSSProperties }) {
  return (
    <div className={cx('subbox', m && 'subbox--m')} style={style}>
      {children}
    </div>
  )
}

import type { ReactNode } from 'react'
import { Icon } from './Icon'

interface ListRowProps {
  title: ReactNode
  sub?: ReactNode
  value?: ReactNode
  /** 오른쪽 › 표시 */
  chevron?: boolean
  leading?: ReactNode
}

/** 모바일 목록 행: 제목/보조 설명 · 오른쪽 값 · › */
export function ListRow({ title, sub, value, chevron = true, leading }: ListRowProps) {
  return (
    <div className="list-row">
      {leading}
      <div className="list-row__main">
        <div className="list-row__title">{title}</div>
        {sub && <div className="list-row__sub">{sub}</div>}
      </div>
      {value !== undefined && <div className="list-row__value">{value}</div>}
      {chevron && <Icon name="chevronRight" size={16} color="var(--text-disabled)" />}
    </div>
  )
}

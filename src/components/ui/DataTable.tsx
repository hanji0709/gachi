import type { CSSProperties, ReactNode } from 'react'
import { cx } from './cx'

export interface Column {
  key: string
  label: ReactNode
  align?: 'left' | 'right' | 'center'
  /** 셀 글자 굵게(600) */
  strong?: boolean
  width?: number | string
}

export type Row = Record<string, ReactNode> & { _total?: boolean; _style?: CSSProperties }

interface DataTableProps {
  columns: Column[]
  rows: Row[]
  /** 상자(테두리+둥근 모서리+가로 스크롤)로 감쌀지. 카드 안에 꽉 차게 넣을 땐 false */
  boxed?: boolean
  caption?: string
  style?: CSSProperties
}

/**
 * 표: 머리행 surface-sub 배경 + label 서체, 행 구분 1px line, 숫자 열 오른쪽 정렬,
 * 합계 행 surface-sub 배경 + 600 굵기, 넓은 표는 상자 안에서 가로 스크롤
 */
export function DataTable({ columns, rows, boxed = true, caption, style }: DataTableProps) {
  const table = (
    <table className="table">
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} scope="col" style={{ textAlign: c.align ?? 'left', width: c.width }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={cx(r._total && 'is-total')} style={r._style}>
            {columns.map((c) => (
              <td key={c.key} className={cx(c.strong && 'strong')} style={{ textAlign: c.align ?? 'left' }}>
                {r[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
  if (!boxed) return <div style={{ overflowX: 'auto', ...style }}>{table}</div>
  return (
    <div className="table-box" style={style}>
      {table}
    </div>
  )
}

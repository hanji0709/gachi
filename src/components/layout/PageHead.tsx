import type { ReactNode } from 'react'

interface PageHeadProps {
  title: ReactNode
  desc?: ReactNode
  /** 오른쪽 필터·도구 영역 */
  tools?: ReactNode
}

/** PC 페이지 제목 줄: 제목 + 설명 · 오른쪽 필터 */
export function PageHead({ title, desc, tools }: PageHeadProps) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-head__title">{title}</h1>
        {desc && <p className="page-head__desc">{desc}</p>}
      </div>
      {tools && <div className="page-head__tools">{tools}</div>}
    </div>
  )
}

/** 모바일 필터 가로 스크롤 줄 */
export function MFilterRow({ children }: { children: ReactNode }) {
  return <div className="m-filter-row">{children}</div>
}

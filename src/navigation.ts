import type { IconName } from './components/ui'

export interface NavItem {
  path: string
  /** PC 상단 메뉴 이름 */
  pcLabel: string
  /** 모바일 하단 탭 이름 */
  mLabel: string
  /** 모바일 상단 제목 */
  mTitle: string
  icon: IconName
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/balance', pcLabel: '재무상태표', mLabel: '재무상태표', mTitle: '재무상태표', icon: 'navBalance' },
  { path: '/settle', pcLabel: '월별 결산', mLabel: '월별 결산', mTitle: '10월 결산', icon: 'navSettle' },
  { path: '/pnl', pcLabel: '기간별 손익 분석', mLabel: '손익 분석', mTitle: '손익 분석', icon: 'navPnl' },
  { path: '/cash', pcLabel: '월 현금흐름', mLabel: '현금흐름', mTitle: '현금흐름', icon: 'navCash' },
  { path: '/fire', pcLabel: '경제적 자유', mLabel: '경제적 자유', mTitle: '경제적 자유', icon: 'navFire' },
]

export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((n) => pathname === n.path || pathname.startsWith(n.path + '/'))
}

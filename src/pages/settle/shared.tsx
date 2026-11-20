import type { Member, MemberRole } from '../../auth/AuthProvider'
import type { PnlGroup, Sector, SettlementStatus } from '../../data/ledger'
import type { SettlementModel } from '../../data/useSettlement'

/* 월별 결산 PC·모바일 공통 */

export const PNL_GROUP_TITLE: Record<PnlGroup, string> = {
  income: '(1) 수입',
  fixed: '(2) 고정지출',
  variable: '(3) 변동지출',
  saving: '(4) 투자 및 저축/상환',
}

export const SECTOR_COLOR: Record<Sector, string> = {
  시장지수: 'var(--chart-1)',
  AI하드웨어: 'var(--chart-2)',
  첨단산업: 'var(--chart-3)',
  AI소프트웨어: 'var(--chart-4)',
  채권: 'var(--chart-5)',
  암호화폐: 'var(--chart-6)',
  '바이오/헬스': 'var(--chart-7)',
  기타: 'var(--chart-8)',
}

export type MonthState = SettlementStatus | 'none'

export const MONTH_BADGE: Record<MonthState, { tone: 'good' | 'info' | 'neutral'; text: string; dot: string }> = {
  closed: { tone: 'good', text: '마감', dot: 'var(--good)' },
  in_progress: { tone: 'info', text: '진행 중', dot: 'var(--violet-700)' },
  none: { tone: 'neutral', text: '미시작', dot: 'var(--line-strong)' },
}

export const monthStatusOf = (model: SettlementModel): MonthState => model.settlement?.status ?? 'none'

const ROLE_LABEL: Record<MemberRole, '남편' | '아내'> = { husband: '남편', wife: '아내' }

/**
 * 확인·마감 규칙
 * - 가구 구성원 모두가 '확인'해야 마감 가능 (혼자인 가구는 본인만)
 * - 마감되면 입력 잠김, '마감 해제'하면 확인도 초기화
 */
export function closeRule(model: SettlementModel, members: Member[], me: Member | null) {
  const s = model.settlement
  const confirmedOf = (role: MemberRole) => Boolean(role === 'husband' ? s?.husbandConfirmedAt : s?.wifeConfirmedAt)
  const people = members.map((m) => ({ role: m.role, label: ROLE_LABEL[m.role], name: m.displayName, confirmed: confirmedOf(m.role) }))
  const allConfirmed = people.length > 0 && people.every((p) => p.confirmed)
  const closed = s?.status === 'closed'
  const meConfirmed = me ? confirmedOf(me.role) : false
  const waiting = people.filter((p) => !p.confirmed).map((p) => p.name)
  const hint = closed
    ? '마감된 결산이에요. 재무상태표에 이 달 기준으로 반영돼요.'
    : allConfirmed
      ? '모두 확인했어요. 마감할 수 있어요.'
      : members.length < 2
        ? '배우자가 참여하기 전에는 혼자 확인하고 마감할 수 있어요'
        : `${waiting.join(', ')}님의 확인을 기다리는 중 · 둘 다 확인하면 마감할 수 있어요`
  return { people, closed, meConfirmed, canClose: allConfirmed && !closed, hint }
}

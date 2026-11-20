import { Link } from 'react-router-dom'
import { PageHead } from '../../components/layout/PageHead'
import { Card, Icon, TipRow, TipTitle } from '../../components/ui'
import { formatShort } from '../../data/format'
import './fire.css'

export type FireTab = 'status' | 'forecast'

export const FIRE_TABS: { key: FireTab; label: string; to: string }[] = [
  { key: 'status', label: '달성 현황', to: '/fire' },
  { key: 'forecast', label: '미래 예측', to: '/fire/forecast' },
]

/** PC 제목 줄 + 달성 현황 / 미래 예측 탭 */
export function FireHead({ active }: { active: FireTab }) {
  return (
    <>
      <PageHead title="경제적 자유" desc="지금 얼마나 왔는지, 언제 도달하는지 함께 봅니다" />
      <div role="tablist" className="tabs fire-tabs">
        {FIRE_TABS.map((t) => (
          <Link
            key={t.key}
            to={t.to}
            role="tab"
            aria-selected={t.key === active}
            className="tabs__tab"
          >
            {t.label}
          </Link>
        ))}
      </div>
    </>
  )
}

const GOALS = [
  { k: '기본 생활비', v: '2,345,678원/월' },
  { k: '전체 지출', v: '8,765,432원/월' },
  { k: '안전 인출률', v: '4%' },
  { k: '희망 도달', v: '2040년' },
  { k: '투자 가능 자산', v: '금융투자' },
  { k: '세미 FIRE 근로소득', v: '4,321,098원/월' },
]

/** PC 우리 집 목표 카드 */
export function GoalCard() {
  return (
    <Card style={{ padding: 20 }}>
      <div className="fire-goal__head">
        <span className="fire-goal__title">
          <Icon name="navFire" size={18} strokeWidth={2} color="var(--violet-700)" />
          우리 집 목표
        </span>
        <button type="button" className="fire-goal__edit">
          편집
        </button>
      </div>
      <div className="fire-goal__grid">
        {GOALS.map((g) => (
          <div key={g.k} style={{ minWidth: 0 }}>
            <div className="fire-goal__k">{g.k}</div>
            <div className="fire-goal__v">{g.v}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export interface Milestone {
  pct: string
  text: string
  done?: boolean
}

export const MILESTONES: Milestone[] = [
  { pct: '25%', text: '2025-08 달성', done: true },
  { pct: '50%', text: '2030년 예상' },
  { pct: '75%', text: '2037년 예상' },
  { pct: '100%', text: '2044년 예상' },
]

/** 마일스톤 동그라미 (달성 시 채움 + 체크) */
export function MilestoneDot({ done, size, checkSize, checkStroke }: { done?: boolean; size: number; checkSize: number; checkStroke: number }) {
  return (
    <span
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        background: done ? 'var(--violet-700)' : 'var(--surface)',
        border: `2px solid ${done ? 'var(--violet-700)' : 'var(--line-strong)'}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {done && (
        <svg
          width={checkSize}
          height={checkSize}
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="#fff"
          strokeWidth={checkStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12l5 5 9-9" />
        </svg>
      )}
    </span>
  )
}

export function milestoneTextStyle(done?: boolean) {
  return {
    fontSize: 13,
    color: done ? 'var(--good)' : 'var(--text-sub)',
    fontWeight: done ? 600 : 400,
  } as const
}

/* ───────── 월별 순자산 추이: 막대 하나의 상세 팝업 (PC·모바일 공용) ───────── */

/** 그래프에 그려진 12개월: 2025-11 ~ 2026-10 */
export const NW_MONTH_LABELS = Array.from({ length: 12 }, (_, i) => {
  const m = ((10 + i) % 12) + 1
  return `${i < 2 ? 2025 : 2026}년 ${m}월`
})

/** 막대 한 개의 세로 길이(px)들 */
export interface NwBarHeights {
  estate: number
  fin: number
  dep: number
  pen: number
  debt: number
  /** 0억선에서 순자산 점까지 (위쪽 +) */
  net: number
}

/**
 * px → 원: 0억선과 10억선 사이 거리로 환산 (실데이터 연결 전 디자인 좌표 기준)
 * zeroY: 0억선 y · tenY: 10억선 y
 */
export function NetWorthTip({ month, h, zeroY, tenY }: { month: string; h: NwBarHeights; zeroY: number; tenY: number }) {
  const won = (px: number) => `${formatShort((px * 1e9) / (zeroY - tenY))}원`
  return (
    <>
      <TipTitle>{month}</TipTitle>
      <TipRow color="var(--chart-1)" label="부동산" value={won(h.estate)} />
      <TipRow color="var(--chart-2)" label="금융투자" value={won(h.fin)} />
      <TipRow color="var(--chart-3)" label="예적금" value={won(h.dep)} />
      <TipRow color="var(--chart-4)" label="연금·기타" value={won(h.pen)} />
      <TipRow color="var(--line-strong)" label="부채" value={`−${won(h.debt)}`} />
      <TipRow color="var(--text)" line label="순자산" value={won(h.net)} strong />
    </>
  )
}

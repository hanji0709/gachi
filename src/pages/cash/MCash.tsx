import type { CSSProperties } from 'react'
import { Button, Card, CardHeader, Dot, Icon, IconButton, OWNER_COLOR, StatCard, Tabs, type Owner } from '../../components/ui'
import { BalanceChart, M_CHART } from './BalanceChart'

/* ───────── 데이터 (디자인 값 그대로) ───────── */
interface DayGroup {
  day: string
  balance: string
  danger?: boolean
  items: { name: string; owner: Owner; amount: string; income?: boolean }[]
}

const DAYS: DayGroup[] = [
  {
    day: '20일 · 오늘',
    balance: '잔액 2,337,043원',
    danger: true,
    items: [
      { name: 'B생명 주담대', owner: '공동', amount: '−456,789' },
      { name: 'C은행 주담대', owner: '공동', amount: '−1,234,567' },
    ],
  },
  {
    day: '21일',
    balance: '잔액 6,904,933원',
    items: [{ name: '아내 근로소득', owner: '아내', amount: '+4,567,890', income: true }],
  },
  {
    day: '22일',
    balance: '잔액 6,583,835원',
    items: [{ name: 'E은행 신용대출', owner: '남편', amount: '−321,098' }],
  },
  {
    day: '25일',
    balance: '잔액 10,904,933원',
    items: [{ name: '남편 근로소득', owner: '남편', amount: '+4,321,098', income: true }],
  },
]

const note: CSSProperties = { fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }

function DaySection({ g }: { g: DayGroup }) {
  return (
    <div style={{ padding: '4px 0 8px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          borderRadius: 12,
          background: g.danger ? 'var(--bad-bg)' : 'var(--surface-sub)',
          fontSize: 13,
          fontWeight: 600,
          color: g.danger ? 'var(--bad)' : 'var(--text)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {g.danger && <Icon name="warning" size={15} color="var(--bad)" strokeWidth={2} />}
          {g.day}
        </span>
        <span>{g.balance}</span>
      </div>
      {g.items.map((it) => (
        <div
          key={it.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 0',
            borderTop: '1px solid var(--line)',
            minHeight: 44,
            boxSizing: 'border-box',
          }}
        >
          <Dot color={OWNER_COLOR[it.owner]} />
          <span style={{ flex: 1, fontSize: 15 }}>{it.name}</span>
          <b style={{ fontSize: 15, color: it.income ? 'var(--good)' : 'var(--text)' }}>{it.amount}</b>
        </div>
      ))}
    </div>
  )
}

/* ───────── 화면 ───────── */
export function MCash() {
  return (
    <>
      {/* 고정 항목 탭 내용은 디자인에 없어 현금흐름 내용을 그대로 보여 줌 */}
      <Tabs variant="pill" tabs={['현금흐름', '고정 항목']} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="chevronLeft" label="이전 달" iconSize={22} />
        <b style={{ fontSize: 15 }}>2026년 11월</b>
        <IconButton icon="chevronRight" label="다음 달" iconSize={22} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
        <StatCard
          size="m"
          label="시작 잔액"
          value="9,876,543"
          footer={
            <button
              type="button"
              aria-label="시작 잔액 편집"
              style={{
                display: 'block',
                marginTop: 2,
                padding: 0,
                border: 'none',
                background: 'transparent',
                fontSize: 12,
                color: 'var(--violet-700)',
                fontWeight: 600,
              }}
            >
              편집
            </button>
          }
        />
        <StatCard size="m" label="월말 예상" value="9,213,577" delta="▼ −662,966원" deltaTone="good" />
        <StatCard
          size="m"
          label="최저 잔액 · 20일"
          value="2,337,043"
          valueColor="var(--bad)"
          outline="bad"
          footer={<div style={{ fontSize: 12, color: 'var(--bad)', fontWeight: 600 }}>안전 잔액보다 662,957 부족</div>}
        />
        <StatCard size="m" label="쓸 수 있는 잉여" value="6,213,577" footer={<div style={note}>안전 잔액 300만 제외</div>} />
      </div>

      <Card pad="md">
        <CardHeader variant="m" title="예상 잔액" right={<span style={{ fontSize: 12, color: 'var(--text-sub)' }}>점을 누르면 그날로</span>} />
        <BalanceChart g={M_CHART} />
      </Card>

      <Card pad="md">
        <CardHeader variant="m" title="날짜별 현금흐름" right={<span style={{ fontSize: 12, color: 'var(--text-sub)' }}>20일부터</span>} />
        {DAYS.map((g) => (
          <DaySection key={g.day} g={g} />
        ))}
        <Button variant="secondary" block>
          + 이번 달만 추가
        </Button>
      </Card>
    </>
  )
}

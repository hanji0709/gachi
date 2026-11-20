import type { CSSProperties, ReactNode } from 'react'
import {
  Button,
  Card,
  CardHeader,
  Delta,
  Icon,
  Label,
  Money,
  MoneyField,
  OwnerChips,
  OwnerTag,
  StackBar,
  Tabs,
  type Owner,
} from '../../components/ui'
import { PageHead } from '../../components/layout/PageHead'
import { BalanceChart, PC_CHART } from './BalanceChart'

/* ───────── 데이터 (디자인 값 그대로) ───────── */
interface FlowItem {
  day: string
  name: string
  owner: Owner
  amount: string
  balance: string
  income?: boolean
  danger?: boolean
}

const FLOWS: FlowItem[] = [
  { day: '1일', name: '월투자금액', owner: '공동', amount: '−3,456,789원', balance: '5,185,187원' },
  { day: '1일', name: '개인용돈(남편, 아내)', owner: '공동', amount: '−1,234,567원', balance: '5,185,187원' },
  { day: '5일', name: 'A화재 보험', owner: '남편', amount: '−45,678원', balance: '5,139,509원' },
  { day: '9일', name: '관리비+인터넷+TV', owner: '공동', amount: '−345,678원', balance: '4,793,831원' },
  { day: '10일', name: 'A은행 주담대', owner: '공동', amount: '−765,432원', balance: '4,028,399원' },
  { day: '20일', name: 'B생명 주담대', owner: '공동', amount: '−456,789원', balance: '2,337,043원', danger: true },
  { day: '20일', name: 'C은행 주담대', owner: '공동', amount: '−1,234,567원', balance: '2,337,043원', danger: true },
  { day: '21일', name: '아내 근로소득', owner: '아내', amount: '+4,567,890원', balance: '6,904,933원', income: true },
  { day: '22일', name: 'E은행 신용대출', owner: '남편', amount: '−321,098원', balance: '6,583,835원' },
  { day: '25일', name: '남편 근로소득', owner: '남편', amount: '+4,321,098원', balance: '10,904,933원', income: true },
  { day: '26일', name: 'D저축은행 주담대(법인)', owner: '공동', amount: '−987,654원', balance: '8,559,256원' },
  { day: '26일', name: '각종 보험', owner: '공동', amount: '−234,567원', balance: '8,559,256원' },
  { day: '26일', name: '차량임차료(법인)', owner: '공동', amount: '−1,123,456원', balance: '8,559,256원' },
  { day: '30일', name: '배당, 이자 합계', owner: '공동', amount: '+654,321원', balance: '9,213,577원', income: true },
]

const HEADERS: { label: string; right?: boolean }[] = [
  { label: '날짜' },
  { label: '내용' },
  { label: '소유자' },
  { label: '변동', right: true },
  { label: '잔액', right: true },
]

/** 날짜별 현금흐름 표 (위험 행 배경 강조가 필요해 .table 클래스로 직접 렌더) */
function FlowTable() {
  const bad = { color: 'var(--bad)' }
  return (
    <div className="table-box">
      <table className="table">
        <caption className="sr-only">날짜별 현금흐름</caption>
        <thead>
          <tr>
            {HEADERS.map((h) => (
              <th key={h.label} scope="col" style={{ textAlign: h.right ? 'right' : 'left' }}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="strong">시작</td>
            <td>시작 잔액</td>
            <td />
            <td />
            <td className="strong num">9,876,543원</td>
          </tr>
          {FLOWS.map((f, i) => (
            <tr key={i} style={f.danger ? { background: 'var(--bad-bg)' } : undefined}>
              <td className="strong" style={f.danger ? bad : undefined}>
                {f.day}
              </td>
              <td>{f.name}</td>
              <td>
                <OwnerTag owner={f.owner} />
              </td>
              <td className="strong num" style={f.income ? { color: 'var(--good)' } : undefined}>
                {f.amount}
              </td>
              <td className="strong num" style={f.danger ? bad : undefined}>
                {f.balance}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const OUTFLOW = [
  { label: '생활비 29%', value: 2983946, color: 'var(--violet-300)' },
  { label: '대출 상환 37%', value: 3765540, color: 'var(--violet-700)' },
  { label: '저축/투자 34%', value: 3456789, color: 'var(--cyan-500)' },
]

const ALLOCATION = [
  { id: 'al-0', label: '비상금', value: 500000, text: '500,000', color: 'var(--violet-300)' },
  { id: 'al-1', label: '저축', value: 1000000, text: '1,000,000', color: 'var(--violet-500)' },
  { id: 'al-2', label: '투자', value: 3000000, text: '3,000,000', color: 'var(--violet-700)' },
  { id: 'al-3', label: '추가 상환', value: 1500000, text: '1,500,000', color: 'var(--cyan-500)' },
]

/* ───────── 조각 ───────── */
function MonthStepper() {
  const btn: CSSProperties = {
    width: 36,
    height: 36,
    border: 'none',
    background: 'transparent',
    borderRadius: 10,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'var(--surface)',
        border: '1px solid var(--line-strong)',
        borderRadius: 14,
        padding: 2,
      }}
    >
      <button type="button" aria-label="이전" style={btn}>
        <Icon name="chevronLeft" size={18} color="var(--text-sub)" />
      </button>
      <span style={{ fontSize: 14, fontWeight: 600, padding: '0 6px', whiteSpace: 'nowrap' }}>2026년 11월</span>
      <button type="button" aria-label="다음" style={btn}>
        <Icon name="chevronRight" size={18} color="var(--text-sub)" />
      </button>
    </div>
  )
}

interface KpiProps {
  label: ReactNode
  value: string
  valueColor?: string
  outline?: 'bad'
  action?: ReactNode
  children: ReactNode
}

/** 요약 카드 (숫자 26px · 단위 13px) */
function Kpi({ label, value, valueColor, outline, action, children }: KpiProps) {
  return (
    <Card outline={outline}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Label>{label}</Label>
        {action}
      </div>
      <div style={{ margin: '6px 0 4px' }}>
        <Money value={value} size={26} unitSize={13} color={valueColor} />
      </div>
      {children}
    </Card>
  )
}

const note: CSSProperties = { fontSize: 12, color: 'var(--text-sub)' }

/* ───────── 화면 ───────── */
export function PcCash() {
  return (
    <>
      <PageHead
        title="월 현금흐름"
        desc="고정 수입·지출을 날짜 순서로 쌓아 이번 달 통장 잔액을 미리 봅니다"
        tools={
          <>
            <MonthStepper />
            <OwnerChips />
          </>
        }
      />
      <Tabs tabs={['현금흐름', '고정 항목 14']} style={{ gap: 28, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 20 }}>
        <Kpi
          label="시작 잔액"
          value="9,876,543"
          action={
            <button
              type="button"
              aria-label="시작 잔액 편집"
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--violet-700)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              편집
            </button>
          }
        >
          <div style={note}>10월 마감 유동성 자산 기준</div>
        </Kpi>
        <Kpi label="월말 예상 잔액" value="9,213,577">
          <Delta tone="good" suffix=" 시작 대비">
            ▼ −662,966원
          </Delta>
        </Kpi>
        <Kpi label="최저 잔액" value="2,337,043" valueColor="var(--bad)" outline="bad">
          <div style={{ fontSize: 13, color: 'var(--bad)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="warning" size={16} color="var(--bad)" strokeWidth={2} />
            20일 · 안전 잔액보다 662,957원 부족
          </div>
        </Kpi>
        <Kpi label="쓸 수 있는 잉여" value="6,213,577">
          <div style={note}>월말 예상 − 안전 잔액 300만</div>
        </Kpi>
      </div>
      <Card style={{ padding: 20, marginTop: 20 }}>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>총 유입</span>{' '}
            <b style={{ color: 'var(--good)', fontSize: 16 }}>+9,543,309원</b>
          </div>
          <div>
            <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>총 유출</span> <b style={{ fontSize: 16 }}>−10,206,275원</b>
          </div>
          <div style={{ flex: 1, minWidth: 320 }}>
            <StackBar height={12} segments={OUTFLOW.map(({ value, color }) => ({ value, color }))} />
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-sub)', marginTop: 6 }}>
              {OUTFLOW.map((o) => (
                <span key={o.label}>{o.label}</span>
              ))}
            </div>
          </div>
        </div>
      </Card>
      <Card style={{ marginTop: 20 }}>
        <CardHeader
          title="예상 잔액 추이"
          right={<span style={note}>점을 누르면 그날 내역으로 이동</span>}
        />
        <BalanceChart g={PC_CHART} />
      </Card>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', marginTop: 20 }}>
        <div style={{ flex: '999 1 640px', minWidth: 0 }}>
          <Card>
            <CardHeader
              title="날짜별 현금흐름"
              right={
                <Button variant="secondary" size="sm" style={{ padding: '0 12px', fontSize: 15, gap: 4 }}>
                  <Icon name="plus" size={16} color="var(--violet-700)" strokeWidth={2} />
                  이번 달만 추가
                </Button>
              }
            />
            <FlowTable />
          </Card>
        </div>
        <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <Card>
            <CardHeader title="잉여 현금 배분 계획" />
            <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 12 }}>
              쓸 수 있는 잉여 <b style={{ color: 'var(--text)' }}>6,213,577원</b>
            </div>
            <StackBar
              height={12}
              segments={[
                ...ALLOCATION.map(({ value, color }) => ({ value, color })),
                { value: 213577, color: 'var(--surface-sub)' },
              ]}
            />
            {ALLOCATION.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <span className="legend__swatch" style={{ background: a.color }} />
                <label htmlFor={a.id} style={{ flex: 1, fontSize: 14 }}>
                  {a.label}
                </label>
                <MoneyField id={a.id} defaultValue={a.text} unit="" size="sm" style={{ width: 140 }} />
              </div>
            ))}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 16,
                paddingTop: 12,
                borderTop: '1px solid var(--line)',
                fontSize: 14,
              }}
            >
              <span style={{ color: 'var(--text-sub)' }}>남은 금액</span>
              <b>213,577원</b>
            </div>
            <div style={{ marginTop: 16 }}>
              <Button block>계획 저장</Button>
            </div>
          </Card>
          <Card>
            <CardHeader title="이번 달만 있는 항목" />
            <div style={{ textAlign: 'center', padding: '20px 8px', color: 'var(--text-sub)', fontSize: 14, lineHeight: 1.6 }}>
              경조사, 세금, 보너스처럼
              <br />
              이번 달에만 있는 입출금을 더해 보세요
            </div>
            <Button variant="secondary" block>
              + 이번 달만 추가
            </Button>
          </Card>
        </div>
      </div>
    </>
  )
}

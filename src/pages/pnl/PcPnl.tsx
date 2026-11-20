import { Card, CardHeader, Icon, Segmented, StackBar } from '../../components/ui'
import { PageHead } from '../../components/layout/PageHead'
import { PcFlowMap } from './PcFlowMap'
import { PnlStatCard, SUMMARY, TrendChart, TrendLegend, type TrendMonth } from './shared'

const TREND_MONTHS: TrendMonth[] = [
  { label: '7월', x: 124, incomeY: 52.7, expenseY: 106.9, netY: 153.9 },
  { label: '8월', x: 276, incomeY: 54.4, expenseY: 103.5, netY: 158.9 },
  { label: '9월', x: 428, incomeY: 37.6, expenseY: 105.7, netY: 139.8 },
]

const TREND_GRID = [
  { y: 208, label: '0만' },
  { y: 147.3, label: '400만' },
  { y: 86.6, label: '800만' },
  { y: 26.0, label: '1,200만' },
]

const VARIABLE_RANK = [
  { name: '마트·편의점', amount: '218,518원', pct: '39%' },
  { name: '쇼핑', amount: '113,578원', pct: '20%' },
  { name: '생활', amount: '98,785원', pct: '18%' },
  { name: '경조·선물', amount: '91,356원', pct: '16%' },
  { name: '카페', amount: '59,257원', pct: '11%' },
]

const navBtn = {
  width: 36,
  height: 36,
  border: 'none',
  background: 'transparent',
  borderRadius: 10,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const

function PeriodNav() {
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
      <button type="button" aria-label="이전" style={navBtn}>
        <Icon name="chevronLeft" size={18} color="var(--text-sub)" />
      </button>
      <span style={{ fontSize: 14, fontWeight: 600, padding: '0 6px', whiteSpace: 'nowrap' }}>2026-07 ~ 2026-09</span>
      <button type="button" aria-label="다음" style={navBtn}>
        <Icon name="chevronRight" size={18} color="var(--text-sub)" />
      </button>
    </div>
  )
}

export function PcPnl() {
  return (
    <>
      <PageHead
        title="기간별 손익 분석"
        desc="월별 결산에서 입력한 손익을 기간만큼 더해 보여줍니다"
        tools={
          <>
            <Segmented label="기간 단위" options={['월', '분기', '연', '사용자 지정']} defaultValue="분기" />
            <PeriodNav />
            <button type="button" className="picker-btn">
              전기 대비
              <Icon name="chevronDown" size={16} color="var(--text-sub)" />
            </button>
          </>
        }
      />

      {/* 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 20 }}>
        {SUMMARY.map((s) => (
          <PnlStatCard key={s.label} item={s} />
        ))}
      </div>

      {/* 흐름 마인드맵 */}
      <Card style={{ marginTop: 20 }}>
        <CardHeader title="수입 흐름표" right={<Segmented label="보기" options={['흐름', '표']} size="sm" />} />
        <PcFlowMap />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(640px, 100%), 1fr))', gap: 20, marginTop: 20 }}>
        {/* 월별 추이 */}
        <Card>
          <CardHeader title="월별 수입·지출 추이" />
          <TrendChart width={520} height={240} xEnd={504} baseY={208} grid={TREND_GRID} months={TREND_MONTHS} />
          <TrendLegend />
        </Card>

        {/* 지출 구조 */}
        <Card>
          <CardHeader title="지출 구조" />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span>
              고정비 <b>97.3%</b>
            </span>
            <span>
              변동비 <b>2.7%</b>
            </span>
          </div>
          <StackBar
            height={14}
            segments={[
              { value: 19740741, color: 'var(--chart-1)' },
              { value: 556788, color: 'var(--chart-2)' },
            ]}
          />
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-sub)', margin: '20px 0 8px' }}>변동지출 순위</div>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {VARIABLE_RANK.map((r, i) => (
              <li
                key={r.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 0',
                  borderTop: '1px solid var(--line)',
                  fontSize: 14,
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 8,
                    background: 'var(--violet-100)',
                    color: 'var(--violet-700)',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: 1 }}>{r.name}</span>
                <b>{r.amount}</b>
                <span style={{ color: 'var(--text-sub)', width: 52, textAlign: 'right' }}>{r.pct}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  )
}

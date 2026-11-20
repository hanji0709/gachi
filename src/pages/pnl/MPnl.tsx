import { Card, CardHeader, IconButton, Segmented } from '../../components/ui'
import { MFlowTree } from './MFlowTree'
import { PnlStatCard, SUMMARY, TrendChart, TrendLegend, type TrendMonth } from './shared'

const TREND_MONTHS: TrendMonth[] = [
  { label: '7월', x: 97.3, incomeY: 44.4, expenseY: 87.5, netY: 124.9 },
  { label: '8월', x: 196.0, incomeY: 45.8, expenseY: 84.8, netY: 128.9 },
  { label: '9월', x: 294.7, incomeY: 32.3, expenseY: 86.6, netY: 113.8 },
]

const TREND_GRID = [
  { y: 168, label: '0만' },
  { y: 119.7, label: '400만' },
  { y: 71.4, label: '800만' },
  { y: 23.1, label: '1,200만' },
]

export function MPnl() {
  return (
    <>
      <Segmented label="기간 단위" options={['월', '분기', '연', '지정']} defaultValue="분기" block />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="chevronLeft" label="이전 기간" />
        <b style={{ fontSize: 15 }}>2026-07 ~ 2026-09</b>
        <IconButton icon="chevronRight" label="다음 기간" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
        {SUMMARY.map((s) => (
          <PnlStatCard key={s.label} item={s} m />
        ))}
      </div>

      <Card pad="md">
        <CardHeader
          variant="m"
          title="수입 흐름표"
          right={<Segmented label="보기" options={['흐름', '표']} size="sm" />}
        />
        <MFlowTree />
      </Card>

      <Card pad="md">
        <CardHeader variant="m" title="월별 추이" />
        <TrendChart width={360} height={200} xEnd={344} baseY={168} grid={TREND_GRID} months={TREND_MONTHS} />
        <TrendLegend />
      </Card>
    </>
  )
}

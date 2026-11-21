import { Card, CardHeader } from '../../components/ui'
import { MFlowTree } from './MFlowTree'
import { ExpenseStructure } from './PcPnl'
import { CustomRange, MPeriodNav, UnitToggle } from './PeriodControls'
import { flowGroups, PnlStatCard, pnlStats, TrendChart, TrendLegend } from './shared'
import type { PnlView } from './usePnlView'

export function MPnl({ p }: { p: PnlView }) {
  const v = p.view
  return (
    <>
      <UnitToggle p={p} m />
      {p.unit === '사용자 지정' ? <CustomRange p={p} m /> : <MPeriodNav p={p} />}

      {!v || v.cur.monthCount === 0 ? (
        <Card pad="md">
          <p className="caption" style={{ padding: '16px 0', textAlign: 'center' }}>
            {p.label} 기간에 입력된 결산이 없어요.
          </p>
        </Card>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
            {pnlStats(v).map((s) => (
              <PnlStatCard key={s.label} item={s} m />
            ))}
          </div>

          <Card pad="md">
            <CardHeader variant="m" title="수입 흐름표" />
            <MFlowTree income={v.cur.summary.income} groups={flowGroups(v)} />
          </Card>

          <Card pad="md">
            <CardHeader variant="m" title={p.trendTitle.replace(' 수입·지출', '')} />
            <TrendChart data={v.trend} width={360} height={200} />
            <TrendLegend />
          </Card>

          <Card pad="md">
            <CardHeader variant="m" title="지출 구조" />
            <ExpenseStructure p={p} />
          </Card>
        </>
      )}
    </>
  )
}

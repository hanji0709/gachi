import { useState } from 'react'
import { Card, CardHeader, Segmented, StackBar } from '../../components/ui'
import { PageHead } from '../../components/layout/PageHead'
import { formatPct, formatWon } from '../../data/format'
import { CustomRange, PeriodNav, UnitToggle } from './PeriodControls'
import { PcFlowMap } from './PcFlowMap'
import { flowGroups, incomeBreakdown, PnlStatCard, pnlStats, TrendChart, TrendLegend } from './shared'
import type { PnlView } from './usePnlView'

export function PcPnl({ p }: { p: PnlView }) {
  const v = p.view
  return (
    <>
      <PageHead
        title="기간별 손익 분석"
        desc="월별 결산에서 입력한 손익을 기간만큼 더해 보여줍니다"
        tools={
          <>
            <UnitToggle p={p} />
            {p.unit === '사용자 지정' ? <CustomRange p={p} /> : <PeriodNav p={p} />}
          </>
        }
      />

      {!v || v.cur.monthCount === 0 ? (
        <Card>
          <p className="caption" style={{ padding: '24px 0', textAlign: 'center' }}>
            {p.label} 기간에 입력된 결산이 없어요.
          </p>
        </Card>
      ) : (
        <>
          {/* 요약 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 20 }}>
            {pnlStats(v).map((s) => (
              <PnlStatCard key={s.label} item={s} />
            ))}
          </div>

          {/* 흐름 마인드맵 */}
          <Card style={{ marginTop: 20 }}>
            <CardHeader title="수입 흐름표" right={<span className="micro">항목을 누르면 세부 내용이 펼쳐져요</span>} />
            <PcFlowMap income={v.cur.summary.income} incomeSub={incomeBreakdown(v)} groups={flowGroups(v)} />
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(640px, 100%), 1fr))', gap: 20, marginTop: 20 }}>
            {/* 월별 추이 */}
            <Card>
              <CardHeader title={p.trendTitle} />
              <TrendChart data={v.trend} width={520} height={240} />
              <TrendLegend />
            </Card>

            {/* 지출 구조 */}
            <Card>
              <CardHeader title="지출 구조" />
              <ExpenseStructure p={p} />
            </Card>
          </div>
        </>
      )}
    </>
  )
}

type RankKind = '고정지출 순위' | '변동지출 순위'

/** 지출 구조: 고정비·변동비 비중 + 고정/변동 지출 순위 (PC·모바일 공용) */
export function ExpenseStructure({ p }: { p: PnlView }) {
  const [kind, setKind] = useState<RankKind>('변동지출 순위')
  const v = p.view!
  const { fixed, variable, expense } = v.cur.summary
  const grp = kind === '고정지출 순위' ? 'fixed' : 'variable'
  const groupTotal = grp === 'fixed' ? fixed : variable
  const rank = v.cur.byGroup[grp].filter((t) => t.amount > 0).slice(0, 5)
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
        <span>
          고정비 <b>{formatPct(expense > 0 ? fixed / expense : 0, 1)}</b>
        </span>
        <span>
          변동비 <b>{formatPct(expense > 0 ? variable / expense : 0, 1)}</b>
        </span>
      </div>
      <StackBar
        height={14}
        segments={[
          { value: fixed, color: 'var(--chart-1)' },
          { value: variable, color: 'var(--chart-2)' },
        ]}
      />
      <div style={{ margin: '20px 0 8px' }}>
        <Segmented label="순위 보기" size="sm" options={['고정지출 순위', '변동지출 순위']} value={kind} onChange={(x) => setKind(x as RankKind)} />
      </div>
      {rank.length === 0 ? (
        <p className="caption">이 기간에 {grp === 'fixed' ? '고정지출' : '변동지출'}이 없어요.</p>
      ) : (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {rank.map((r, i) => (
            <li key={r.item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--line)', fontSize: 14 }}>
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
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>{r.item.name}</span>
              <b>{formatWon(r.amount)}원</b>
              <span style={{ color: 'var(--text-sub)', width: 44, textAlign: 'right' }}>{formatPct(groupTotal > 0 ? r.amount / groupTotal : 0, 0)}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}

import { useState } from 'react'
import { BAR_FILL_DURATION, SlotNumber } from '../../animation/SlotNumber'
import { MFilterRow } from '../../components/layout/PageHead'
import {
  Button,
  Card,
  CardHeader,
  Donut,
  InfoChip,
  LegendGrid,
  ListRow,
  OwnerChips,
  Segmented,
  StackBar,
  StatCard,
  SubBox,
  Switch,
  TipRow,
  TipTitle,
} from '../../components/ui'
import { formatPct } from '../../data/format'
import { NetWorthTrendM } from './NetWorthTrend'
import { MonthPicker } from './parts'
import { ASSET_COLORS, DEBT_COLORS, type AccountRow, type BalanceView } from './useBalanceView'

/** 처음에 보여 줄 목록 개수 (나머지는 "모두 보기") */
const PREVIEW_ROWS = 4

export function MBalance({ view }: { view: BalanceView }) {
  const { sheet, prevSheet } = view
  const assetDelta = view.delta(prevSheet ? sheet.totalAssets - prevSheet.totalAssets : null, true)
  const debtDelta = view.delta(prevSheet ? sheet.totalDebt - prevSheet.totalDebt : null, false)
  const netDelta = view.delta(prevSheet ? sheet.netWorth - prevSheet.netWorth : null, true)
  const net = view.money(sheet.netWorth)
  const ta = view.money(sheet.totalAssets)
  const td = view.money(sheet.totalDebt)
  const pctOf = (v: number, total: number) => formatPct(total > 0 ? v / total : 0, 1)
  const topSectors = [...view.sectors].sort((a, b) => b.amount - a.amount).filter((s) => s.amount > 0)
  const restShare = topSectors.slice(5).reduce((s, x) => s + x.share, 0)

  return (
    <>
      <MFilterRow>
        <MonthPicker view={view} variant="m" />
        <OwnerChips variant="m" bare value={view.owners} onChange={view.setOwners} />
        <Segmented
          label="통화"
          options={['₩', '$']}
          size="sm"
          value={view.currency === 'usd' ? '$' : '₩'}
          onChange={(v) => view.setCurrency(v === '$' && view.fx ? 'usd' : 'krw')}
        />
      </MFilterRow>

      {/* 순자산 히어로 */}
      <Card pad="md" hero style={{ padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>순자산</div>
        <div style={{ margin: '4px 0 6px', fontSize: 30, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
          <SlotNumber value={net.value} />
          {net.unit && <span style={{ fontSize: 15, fontWeight: 400, opacity: 0.8 }}> {net.unit}</span>}
        </div>
        {netDelta && (
          <span style={{ display: 'inline-flex', fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.18)', padding: '4px 10px', borderRadius: 999 }}>
            {netDelta.text} 전월 대비
          </span>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
        <StatCard size="m" label="총자산" value={<SlotNumber value={ta.value} />} unit={ta.unit} delta={assetDelta?.text} deltaTone={assetDelta?.tone} deltaSuffix=" 전월 대비" />
        <StatCard size="m" label="총부채" value={<SlotNumber value={td.value} />} unit={td.unit} delta={debtDelta?.text} deltaTone={debtDelta?.tone} deltaSuffix=" 전월 대비" />
      </div>

      {/* 자산 구성 */}
      <Card pad="md">
        <CardHeader variant="m" title="자산 구성" right={<span className="caption">{view.short(sheet.totalAssets)}</span>} />
        <StackBar animate={BAR_FILL_DURATION} segments={sheet.assetByCategory.map((c) => ({ value: c.value, color: ASSET_COLORS[c.label] }))} height={12} />
        <LegendGrid
          items={sheet.assetByCategory.map((c) => ({ label: c.label, color: ASSET_COLORS[c.label], pct: pctOf(c.value, sheet.totalAssets) }))}
          style={{ marginTop: 12 }}
        />
        <AccountList view={view} rows={view.assets} noun="자산" sub={(r) => `${r.account.category} · ${view.ownerLabelOf(r.account.owner)}`} />
      </Card>

      {/* 부채 구성 */}
      <Card pad="md">
        <CardHeader variant="m" title="부채 구성" right={<span className="caption">{view.short(sheet.totalDebt)}</span>} />
        <StackBar animate={BAR_FILL_DURATION} segments={sheet.debtByCategory.map((c) => ({ value: c.value, color: DEBT_COLORS[c.label] }))} height={12} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 6px', gap: 8 }}>
          <InfoChip>평균 금리 {formatPct(sheet.weightedRate / 100)}</InfoChip>
          <Switch label="전세금 제외" style={{ fontSize: 13 }} checked={view.excludeJeonse} onChange={view.setExcludeJeonse} />
        </div>
        <AccountList
          view={view}
          rows={view.debts}
          noun="부채"
          sub={(r) => `${r.account.category}${r.account.interestRate === null ? '' : ` · ${r.account.interestRate.toFixed(2)}%`}`}
        />
      </Card>

      {/* 금융투자 섹터 비중 */}
      <Card pad="md">
        <CardHeader variant="m" title="금융투자 섹터 비중" />
        {view.sectorTotal === 0 ? (
          <p className="caption">월별 결산에서 섹터 금액을 입력하면 비중이 보여요.</p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 28, alignItems: 'center', justifyContent: 'center', padding: '4px 8px' }}>
              <Donut
                animate
                label="금융투자 섹터 비중 도넛 차트"
                segments={view.sectors.map((s) => ({ pct: s.share * 100, color: s.color }))}
                tips={view.sectors.map((s) => (
                  <>
                    <TipTitle>{s.sector}</TipTitle>
                    <TipRow color={s.color} label="금액" value={view.moneyText(s.amount)} />
                    <TipRow label="비중" value={formatPct(s.share, 1)} />
                  </>
                ))}
                size={128}
                hole={74}
              >
                <b style={{ fontSize: 14 }}>{view.short(view.sectorTotal)}</b>
              </Donut>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: 132, flexShrink: 0 }}>
                <LegendGrid
                  columns={1}
                  size={12}
                  items={topSectors.slice(0, 5).map((s) => ({ label: s.sector, color: s.color, pct: `${Math.round(s.share * 100)}%` }))}
                  style={{ gap: 7 }}
                />
                {topSectors.length > 5 && <span className="micro">외 {topSectors.length - 5}개 섹터 {Math.round(restShare * 100)}%</span>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginTop: 14 }}>
              <SubBox m>
                <div className="label">금융투자 합계</div>
                <b style={{ fontSize: 16 }}>{view.short(view.sectorTotal)}</b>
              </SubBox>
              <SubBox m>
                <div className="label">총 자산 대비</div>
                <b style={{ fontSize: 16 }}>{pctOf(view.sectorTotal, sheet.totalAssets)}</b>
              </SubBox>
            </div>
          </>
        )}
      </Card>

      {/* 순자산 추이 */}
      <Card pad="md">
        <CardHeader variant="m" title="순자산 추이" right={<span className="micro">최근 1년</span>} />
        <NetWorthTrendM points={view.trend} fmt={view.moneyText} />
      </Card>
    </>
  )
}

/** 자산·부채 목록 (처음 4개 + 모두 보기) */
function AccountList({ view, rows, noun, sub }: { view: BalanceView; rows: AccountRow[]; noun: string; sub: (r: AccountRow) => string }) {
  const [all, setAll] = useState(false)
  if (rows.length === 0) return <p className="micro" style={{ marginTop: 14 }}>표시할 {noun}이 없어요.</p>
  const shown = all ? rows : rows.slice(0, PREVIEW_ROWS)
  return (
    <>
      <div style={{ marginTop: 14 }}>
        {shown.map((r) => (
          <ListRow key={r.account.id} title={r.account.name} sub={sub(r)} value={view.short(r.amount)} chevron={false} />
        ))}
      </div>
      {rows.length > PREVIEW_ROWS && (
        <Button variant="soft" block style={{ marginTop: 8 }} aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? '접기' : `${noun} ${rows.length}개 모두 보기`}
        </Button>
      )}
    </>
  )
}

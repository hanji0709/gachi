import { BAR_FILL_DURATION, SlotNumber } from '../../animation/SlotNumber'
import { PageHead } from '../../components/layout/PageHead'
import {
  Card,
  CardHeader,
  Delta,
  Donut,
  InfoChip,
  Legend,
  Money,
  OWNER_COLOR,
  OwnerChips,
  OwnerTag,
  ProgressBar,
  Segmented,
  StackBar,
  StatCard,
  SubBox,
  Switch,
  TipRow,
  TipTitle,
} from '../../components/ui'
import { formatNumber, formatPct } from '../../data/format'
import type { AccountOwner } from '../../data/ledger'
import { NetWorthTrendPc } from './NetWorthTrend'
import { MonthPicker } from './parts'
import { ASSET_COLORS, DEBT_COLORS, type AccountRow, type BalanceView, type Period } from './useBalanceView'

const twoCol = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(640px, 100%), 1fr))', gap: 20, marginTop: 20 }

/**
 * 자산·부채 표 줄: 표 5열이 가로 스크롤 없이 들어가려면 카드당 약 700px가 필요.
 * 그보다 좁은 화면에서는 두 카드를 위아래로 쌓는다.
 */
const tableRow = { ...twoCol, gridTemplateColumns: 'repeat(auto-fit, minmax(min(700px, 100%), 1fr))' }

const OWNERS: AccountOwner[] = ['joint', 'husband', 'wife']

export function PcBalance({ view }: { view: BalanceView }) {
  const { sheet, prevSheet } = view
  const assetTotal = sheet.totalAssets
  const debtTotal = sheet.totalDebt
  const assetDelta = view.delta(prevSheet ? sheet.totalAssets - prevSheet.totalAssets : null, true)
  const debtDelta = view.delta(prevSheet ? sheet.totalDebt - prevSheet.totalDebt : null, false)
  const netDelta = view.delta(prevSheet ? sheet.netWorth - prevSheet.netWorth : null, true)
  const net = view.money(sheet.netWorth)
  const ta = view.money(assetTotal)
  const td = view.money(debtTotal)

  return (
    <>
      <PageHead
        title="재무상태표"
        desc={`${view.basisLabel} · ${view.ownerLabel}`}
        tools={
          <>
            <MonthPicker view={view} />
            <OwnerChips value={view.owners} onChange={view.setOwners} />
            <Segmented
              label="통화"
              options={['원화', '달러']}
              value={view.currency === 'usd' ? '달러' : '원화'}
              onChange={(v) => view.setCurrency(v === '달러' && view.fx ? 'usd' : 'krw')}
            />
            <span className="micro">{view.fx ? `기준 환율 ${formatNumber(view.fx, 2)}원` : '이 달 마감 환율 미입력'}</span>
          </>
        }
      />

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}>
        <StatCard label="총자산" value={<SlotNumber value={ta.value} />} unit={ta.unit} delta={assetDelta?.text} deltaTone={assetDelta?.tone} deltaSuffix=" 전월 대비" />
        <StatCard label="총부채" value={<SlotNumber value={td.value} />} unit={td.unit} delta={debtDelta?.text} deltaTone={debtDelta?.tone} deltaSuffix=" 전월 대비" />
        {/* 순자산: 모바일과 같은 보라 배경 카드 */}
        <Card hero>
          <div className="label" style={{ color: 'rgba(255,255,255,0.85)' }}>
            순자산
          </div>
          <div style={{ margin: '6px 0 4px', fontSize: 32, lineHeight: 1.25, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
            <SlotNumber value={net.value} />
            {net.unit && <span style={{ fontSize: 16, fontWeight: 400, opacity: 0.8, marginLeft: 2 }}>{net.unit}</span>}
          </div>
          {netDelta && (
            <span
              style={{
                display: 'inline-flex',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                background: 'rgba(255,255,255,0.18)',
                padding: '4px 10px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
              }}
            >
              {netDelta.text} 전월 대비
            </span>
          )}
        </Card>
      </div>

      <div style={tableRow}>
        {/* 자산 구성 */}
        <Card>
          <CardHeader title="자산 구성" />
          <StackBar animate={BAR_FILL_DURATION} segments={sheet.assetByCategory.map((c) => ({ value: c.value, color: ASSET_COLORS[c.label] }))} style={{ marginBottom: 16 }} />
          <Legend
            items={sheet.assetByCategory.map((c) => ({
              label: c.label,
              color: ASSET_COLORS[c.label],
              pct: formatPct(assetTotal > 0 ? c.value / assetTotal : 0, 1),
              amount: view.moneyText(c.value),
            }))}
          />
          <AccountTable view={view} rows={view.assets} kind="asset" />
        </Card>

        {/* 부채 구성 */}
        <Card>
          <CardHeader title="부채 구성" />
          <StackBar animate={BAR_FILL_DURATION} segments={sheet.debtByCategory.map((c) => ({ value: c.value, color: DEBT_COLORS[c.label] }))} style={{ marginBottom: 16 }} />
          <Legend
            items={sheet.debtByCategory.map((c) => ({
              label: c.label,
              color: DEBT_COLORS[c.label],
              pct: formatPct(debtTotal > 0 ? c.value / debtTotal : 0, 1),
              amount: view.moneyText(c.value),
            }))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 12px', gap: 12, flexWrap: 'wrap' }}>
            <InfoChip>가중평균이자율 {formatPct(sheet.weightedRate / 100)}</InfoChip>
            <Switch label="전세금 제외" checked={view.excludeJeonse} onChange={view.setExcludeJeonse} />
          </div>
          <AccountTable view={view} rows={view.debts} kind="liability" />
        </Card>
      </div>

      <div style={twoCol}>
        {/* 지표 */}
        <Card>
          <CardHeader title="지표" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
            <SubBox>
              <div className="label">부채비율</div>
              <div style={{ fontSize: 28, fontWeight: 600, margin: '6px 0' }}>{formatPct(sheet.debtRatio)}</div>
              <ProgressBar animate={BAR_FILL_DURATION} pct={Number.isFinite(sheet.debtRatio) ? Math.min(100, sheet.debtRatio * 100) : 0} height={8} />
            </SubBox>
            <SubBox>
              <div className="label">유동성 자산</div>
              <div style={{ margin: '6px 0' }}>
                <Money {...view.money(sheet.liquid)} size={24} unitSize={12} />
              </div>
              <div className="micro">
                예적금 합계
                {view.fixedExpense > 0 && ` · 월 고정지출의 ${(sheet.liquid / view.fixedExpense).toFixed(1)}배`}
              </div>
            </SubBox>
          </div>
        </Card>

        {/* 소유자별 순자산 */}
        <Card>
          <CardHeader title="소유자별 순자산" />
          {OWNERS.filter((o) => view.owners.includes(view.ownerLabelOf(o))).map((o) => {
            const value = sheet.byOwner[o]
            const share = sheet.netWorth !== 0 ? value / sheet.netWorth : 0
            const label = view.ownerLabelOf(o)
            return (
              <div key={o} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
                  <OwnerTag owner={label} />
                  <span style={{ fontWeight: 600 }}>
                    {view.moneyText(value)} <span style={{ color: 'var(--text-sub)', fontWeight: 400 }}>· {formatPct(share, 1)}</span>
                  </span>
                </div>
                <ProgressBar animate={BAR_FILL_DURATION} pct={Math.max(0, Math.min(100, share * 100))} height={10} color={OWNER_COLOR[label]} />
              </div>
            )
          })}
        </Card>
      </div>

      {/* 금융투자 섹터 비중 */}
      <Card style={{ marginTop: 20 }}>
        <CardHeader title="금융투자 섹터 비중" right={<span className="micro">{view.month} 결산 입력 기준</span>} />
        {view.sectorTotal === 0 ? (
          <p className="caption" style={{ padding: '16px 0' }}>
            월별 결산의 ‘금융투자 섹터 비중’에 금액을 입력하면 비중이 보여요.
          </p>
        ) : (
          <div style={{ display: 'flex', gap: 48, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* 도넛: 남는 폭 안에서 가운데 정렬 */}
            <div style={{ flex: '1 1 260px', display: 'flex', justifyContent: 'center' }}>
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
                size={220}
                hole={132}
              >
                <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>{view.sectors.filter((s) => s.amount > 0).length}개 섹터</span>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{view.short(view.sectorTotal)}</span>
              </Donut>
            </div>
            {/* 범례: 최대 420px */}
            <div style={{ flex: '0 1 420px', minWidth: 340, display: 'flex' }}>
              <Legend items={view.sectors.map((s) => ({ label: s.sector, color: s.color, pct: formatPct(s.share, 1), amount: view.moneyText(s.amount) }))} />
            </div>
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
              <SubBox>
                <div className="label">금융투자 자산 합계</div>
                <div style={{ marginTop: 6 }}>
                  <Money {...view.money(view.sectorTotal)} size={22} unitSize={12} />
                </div>
              </SubBox>
              <SubBox>
                <div className="label">총 자산 대비 비중</div>
                <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>{formatPct(assetTotal > 0 ? view.sectorTotal / assetTotal : 0, 1)}</div>
              </SubBox>
            </div>
          </div>
        )}
      </Card>

      {/* 순자산 추이 */}
      <Card style={{ marginTop: 20 }}>
        <CardHeader
          title="순자산 추이"
          right={<Segmented label="기간" options={['1년', '3년', '전체']} size="sm" value={view.period} onChange={(v) => view.setPeriod(v as Period)} />}
        />
        <NetWorthTrendPc points={view.trend} fmt={view.moneyText} />
      </Card>
    </>
  )
}

/** 자산·부채 목록 표 */
function AccountTable({ view, rows, kind }: { view: BalanceView; rows: AccountRow[]; kind: 'asset' | 'liability' }) {
  if (rows.length === 0) return <p className="caption" style={{ marginTop: 20 }}>표시할 {kind === 'asset' ? '자산' : '부채'}이 없어요.</p>
  return (
    <div className="table-box" style={{ marginTop: kind === 'asset' ? 20 : 0 }}>
      <table className="table">
        <caption className="sr-only">{kind === 'asset' ? '자산' : '부채'} 목록</caption>
        <thead>
          <tr>
            <th scope="col">이름</th>
            <th scope="col">카테고리</th>
            {kind === 'asset' ? <th scope="col">소유자</th> : <th scope="col" style={{ textAlign: 'right' }}>금리</th>}
            <th scope="col" style={{ textAlign: 'right' }}>{kind === 'asset' ? '가치금액' : '잔액'}</th>
            {view.hasPrev && <th scope="col" style={{ textAlign: 'right' }}>전월 대비</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ account: a, amount, delta }) => {
            const d = view.delta(delta, kind === 'asset')
            return (
              <tr key={a.id}>
                <td className="strong">{a.name}</td>
                <td>{a.category}</td>
                {kind === 'asset' ? (
                  <td>
                    <OwnerTag owner={view.ownerLabelOf(a.owner)} />
                  </td>
                ) : (
                  <td style={{ textAlign: 'right' }}>{a.interestRate === null ? '–' : `${a.interestRate.toFixed(2)}%`}</td>
                )}
                <td className="strong" style={{ textAlign: 'right' }}>{view.moneyText(amount)}</td>
                {view.hasPrev && (
                  <td style={{ textAlign: 'right' }}>
                    {d && (
                      <Delta tone={d.tone} size={15} style={d.tone === 'neutral' ? { fontWeight: 400 } : undefined}>
                        {d.text}
                      </Delta>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

import { useRef, useState, type CSSProperties } from 'react'
import { useCssHeight } from '../../components/layout/SoloNotice'
import { FixedLayer } from '../../animation/SmoothScroll'
import { useSmoothPin } from '../../animation/useSmoothPin'
import { useAuth } from '../../auth/AuthProvider'
import { PageHead } from '../../components/layout/PageHead'
import { Badge, Button, Card, CardHeader, Icon, IconButton, Money, OwnerTag, ProgressBar, SubBox } from '../../components/ui'
import { diffTone, groupTotal, sectorTotal, summarizePnl } from '../../data/compute'
import { formatNumber, formatPct, formatWon, splitMonth } from '../../data/format'
import { SECTORS, type AccountKind, type PnlGroup } from '../../data/ledger'
import type { SettlementModel } from '../../data/useSettlement'
import { AddAccountForm } from './AddAccountForm'
import { ExcelUpload } from './ExcelUpload'
import { AmountInput, DIFF_COLOR, SaveStatus } from './parts'
import { closeRule, MONTH_BADGE, monthStatusOf, PNL_GROUP_TITLE, SECTOR_COLOR } from './shared'

interface Props {
  model: SettlementModel
  month: string
  thisMonth: string
  onMonthChange: (m: string) => void
}

export function PcSettle({ model, month, thisMonth, onMonthChange }: Props) {
  // 오른쪽 요약: 스무스 스크롤 중에는 ScrollTrigger pin으로 고정 (사이드바가 옆에 놓이는 폭에서만)
  const summaryRef = useRef<HTMLDivElement>(null)
  useSmoothPin(summaryRef, { offset: 24, media: '(min-width: 1060px)' })
  const { year, month: mm } = splitMonth(month)
  const status = monthStatusOf(model)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 12, fontSize: 13, color: 'var(--text-sub)', flexWrap: 'wrap', minHeight: 30, alignItems: 'center' }}>
        <SaveStatus save={model.save} />
      </div>
      <PageHead
        title={`${year}년 ${mm}월 결산`}
        desc={
          status === 'closed'
            ? '마감됨 · 수정하려면 아래에서 마감을 해제해 주세요'
            : '진행 중 · 손익·자산·섹터를 입력하고 두 사람이 확인하면 마감합니다'
        }
        tools={<ExcelUpload model={model} month={month} onMonthChange={onMonthChange} />}
      />

      <MonthCalendar model={model} month={month} thisMonth={thisMonth} onMonthChange={onMonthChange} />

      {model.loadError ? (
        <Card style={{ marginTop: 20 }}>
          <p role="alert" style={{ color: 'var(--bad)', fontWeight: 600 }}>
            {model.loadError}
          </p>
          <Button variant="secondary" style={{ marginTop: 12 }} onClick={() => void model.reload()}>
            다시 불러오기
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', marginTop: 20 }}>
          <div style={{ flex: '999 1 640px', minWidth: 0 }}>
            <PnlInputCard model={model} />
            <MasterCard model={model} />
            <SectorCard model={model} />
          </div>
          {/* 고정 헤더 아래 24px에 붙음. sticky는 스무스 스크롤이 꺼졌을 때(동작 줄이기)용 */}
          <div
            ref={summaryRef}
            style={{ flex: '1 1 320px', minWidth: 0, position: 'sticky', top: 'calc(var(--header-h, 64px) + 24px)' }}
          >
            <SummaryCard model={model} month={month} />
          </div>
        </div>
      )}

      {/* 하단 고정 바에 마지막 내용이 가려지지 않도록 여백 */}
      <div aria-hidden="true" style={{ height: 40 }} />
      <ConfirmBar model={model} />
    </>
  )
}

/* ───────── 결산 달력 ───────── */
function MonthCalendar({ model, month, thisMonth, onMonthChange }: Props) {
  const { year } = splitMonth(month)
  const thisYear = splitMonth(thisMonth).year
  const go = (y: number, m: number) => onMonthChange(`${y}-${String(m).padStart(2, '0')}`)
  return (
    <Card>
      <CardHeader
        title={`${year}년 결산 달력`}
        right={
          <span style={{ display: 'inline-flex', gap: 4 }}>
            <IconButton icon="chevronLeft" label="이전 해" onClick={() => go(year - 1, 12)} />
            <IconButton icon="chevronRight" label="다음 해" disabled={year >= thisYear} onClick={() => go(year + 1, 1)} />
          </span>
        }
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gap: 8 }}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const key = `${year}-${String(m).padStart(2, '0')}`
          const selected = key === month
          const future = key > thisMonth
          const badge = MONTH_BADGE[model.statusByMonth.get(key) ?? 'none']
          return (
            <button
              key={m}
              type="button"
              aria-current={selected ? 'date' : undefined}
              aria-label={`${m}월 ${badge.text}`}
              disabled={future}
              onClick={() => go(year, m)}
              style={{
                minHeight: 72,
                borderRadius: 14,
                border: selected ? '2px solid var(--violet-700)' : '1px solid var(--line)',
                background: selected ? 'var(--violet-100)' : 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                opacity: future ? 0.45 : 1,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{m}월</span>
              <Badge tone={badge.tone}>{badge.text}</Badge>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

/* ───────── 월별 손익 입력 ───────── */
const itemTd: CSSProperties = { padding: '6px 16px', borderTop: 'none', fontSize: 14 }
const groupTh: CSSProperties = {
  padding: '14px 16px 8px',
  background: 'transparent',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--violet-700)',
  textAlign: 'left',
}

function PnlInputCard({ model }: { model: SettlementModel }) {
  const { items, cur, prev, locked } = model
  const groups: PnlGroup[] = ['income', 'fixed', 'variable', 'saving']
  const prevFx = model.prevSettlement?.fxRate
  return (
    <Card>
      <div data-amount-scope="">
        <CardHeader
          title="월별 손익 입력"
          right={<span style={{ fontSize: 12, color: 'var(--text-sub)' }}>Enter로 다음 칸 · 엑셀에서 세로로 복사해 붙여넣기</span>}
        />
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">항목</th>
                <th scope="col" style={{ textAlign: 'right' }}>지난달</th>
                <th scope="col" style={{ textAlign: 'right' }}>이번 달</th>
                <th scope="col" style={{ textAlign: 'right' }}>차이</th>
              </tr>
            </thead>
            {groups.map((g, gi) => (
              <tbody key={g}>
                <tr>
                  <th scope="rowgroup" colSpan={4} style={{ ...groupTh, borderTop: gi === 0 ? 'none' : '1px solid var(--line)' }}>
                    {PNL_GROUP_TITLE[g]}
                    <span style={{ float: 'right', color: 'var(--text)' }}>{formatWon(groupTotal(items, cur.entries, g))}원</span>
                  </th>
                </tr>
                {items
                  .filter((i) => i.grp === g)
                  .map((it) => {
                    const p = prev.entries.get(it.id)
                    const c = cur.entries.get(it.id)
                    const diff = (c ?? 0) - (p ?? 0)
                    return (
                      <tr key={it.id}>
                        <td style={itemTd}>{it.name}</td>
                        <td style={{ ...itemTd, color: 'var(--text-sub)', textAlign: 'right' }}>{p === undefined ? '–' : formatWon(p)}</td>
                        <td style={{ ...itemTd, textAlign: 'right' }}>
                          <AmountInput label={`${it.name} 이번 달 금액`} value={c} disabled={locked} onCommit={(n) => void model.setEntry(it.id, n)} />
                        </td>
                        <td style={{ ...itemTd, fontSize: 13, textAlign: 'right', color: DIFF_COLOR[diffTone(g, diff)], fontWeight: 600 }}>
                          {diff === 0 ? '0' : `${diff > 0 ? '+' : ''}${formatNumber(diff)}`}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            ))}
            <tbody>
              <tr>
                <th scope="row" style={{ ...groupTh, padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                  (5) 마감 환율(USD)
                </th>
                <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-sub)', fontSize: 14 }}>
                  {prevFx ? formatNumber(prevFx, 2) : '–'}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <AmountInput
                    label="마감 환율 원/달러"
                    decimal
                    value={model.settlement?.fxRate ?? undefined}
                    disabled={locked}
                    onCommit={(n) => void model.setFx(n === 0 ? null : n)}
                  />
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 12, color: 'var(--text-sub)' }}>마감 시 확정</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  )
}

/* ───────── 마스터 자산·부채 ───────── */
function MasterCard({ model }: { model: SettlementModel }) {
  const [tab, setTab] = useState<AccountKind>('asset')
  const [adding, setAdding] = useState(false)
  const list = model.accounts.filter((a) => a.kind === tab)
  const assetCount = model.accounts.filter((a) => a.kind === 'asset').length
  const debtCount = model.accounts.length - assetCount
  const thStyle: CSSProperties = { textAlign: 'left' }
  return (
    <Card style={{ marginTop: 20 }}>
      <div data-amount-scope="">
        <CardHeader
          title="마스터 자산·부채"
          right={
            <Button
              variant="secondary"
              size="sm"
              style={{ padding: '0 12px', gap: 4, fontSize: 15 }}
              aria-expanded={adding}
              onClick={() => setAdding((v) => !v)}
            >
              <Icon name={adding ? 'close' : 'plus'} size={16} color="var(--violet-700)" strokeWidth={2} />
              {adding ? '닫기' : '추가'}
            </Button>
          }
        />
        <div role="tablist" className="tabs" style={{ gap: 28, marginBottom: 16 }}>
          {(
            [
              ['asset', `자산 ${assetCount}`],
              ['liability', `부채 ${debtCount}`],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className="tabs__tab" onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>

        {adding && <AddAccountForm kind={tab} onAdd={(a) => model.addAccount(a).then(() => setAdding(false))} />}

        {list.length === 0 ? (
          <p className="caption" style={{ padding: '24px 0', textAlign: 'center' }}>
            아직 {tab === 'asset' ? '자산' : '부채'}이 없어요. 오른쪽 위 ‘추가’로 등록해 주세요.
          </p>
        ) : (
          <div className="table-box">
            <table className="table">
              <caption className="sr-only">마스터 {tab === 'asset' ? '자산' : '부채'} 목록</caption>
              <thead>
                <tr>
                  <th scope="col" style={thStyle}>이름</th>
                  <th scope="col" style={thStyle}>카테고리</th>
                  {tab === 'liability' && <th scope="col" style={{ textAlign: 'right' }}>금리</th>}
                  <th scope="col" style={{ textAlign: 'right' }}>{tab === 'asset' ? '가치금액' : '잔액'}</th>
                  <th scope="col" style={{ width: 48 }}>
                    <span className="sr-only">삭제</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td className="strong">{a.name}</td>
                    <td>{a.category}</td>
                    {tab === 'liability' && <td style={{ textAlign: 'right' }}>{a.interestRate === null ? '–' : `${a.interestRate.toFixed(2)}%`}</td>}
                    <td style={{ textAlign: 'right', padding: '8px 16px' }}>
                      <AmountInput
                        label={`${a.name} ${tab === 'asset' ? '가치금액' : '잔액'}`}
                        value={model.cur.balances.get(a.id)}
                        disabled={model.locked}
                        onCommit={(n) => void model.setBalance(a.id, n)}
                      />
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <IconButton
                        icon="close"
                        label={`${a.name} 목록에서 빼기`}
                        iconSize={18}
                        disabled={model.locked}
                        onClick={() => {
                          if (window.confirm(`'${a.name}'을(를) 목록에서 뺄까요? 지난 결산 기록은 그대로 남아요.`)) void model.removeAccount(a.id)
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  )
}

/* ───────── 금융투자 섹터 비중 ───────── */
function SectorCard({ model }: { model: SettlementModel }) {
  const masterInvest = model.accounts
    .filter((a) => a.kind === 'asset' && a.category === '금융투자')
    .reduce((s, a) => s + (model.cur.balances.get(a.id) ?? 0), 0)
  const inputTotal = sectorTotal(model.cur)
  const gap = masterInvest - inputTotal
  const ok = gap === 0
  return (
    <Card style={{ marginTop: 20 }}>
      <div data-amount-scope="">
        <CardHeader title="금융투자 섹터 비중" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <SubBox>
            <div className="label">마스터 금융투자 총액</div>
            <div style={{ marginTop: 6 }}>
              <Money value={formatWon(masterInvest)} size={22} unitSize={12} />
            </div>
          </SubBox>
          <SubBox style={{ background: ok ? 'var(--good-bg)' : 'var(--warn-bg)' }}>
            <div className="label">입력 합계와의 차액</div>
            <div style={{ marginTop: 6 }}>
              <Money value={formatWon(gap)} size={22} unitSize={12} color={ok ? 'var(--good)' : 'var(--warn)'} />
            </div>
            <div style={{ fontSize: 12, color: ok ? 'var(--good)' : 'var(--warn)', marginTop: 2 }}>{ok ? '일치' : '섹터 금액 합계를 맞춰 주세요'}</div>
          </SubBox>
        </div>
        <div className="table-box" style={{ marginTop: 16 }}>
          <table className="table">
            <caption className="sr-only">섹터별 금액과 비중</caption>
            <thead>
              <tr>
                <th scope="col">섹터</th>
                <th scope="col" style={{ textAlign: 'right' }}>금액</th>
                <th scope="col" style={{ textAlign: 'right' }}>비중</th>
              </tr>
            </thead>
            <tbody>
              {SECTORS.map((s) => {
                const amount = model.cur.sectors.get(s)
                return (
                  <tr key={s}>
                    <td>
                      <span aria-hidden="true" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: SECTOR_COLOR[s], marginRight: 8 }} />
                      {s}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 16px' }}>
                      <AmountInput label={`${s} 금액`} value={amount} disabled={model.locked} onCommit={(n) => void model.setSector(s, n)} />
                    </td>
                    <td className="strong" style={{ textAlign: 'right' }}>
                      {inputTotal > 0 ? `${Math.round(((amount ?? 0) / inputTotal) * 100)}%` : '–'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  )
}

/* ───────── 오른쪽 요약 ───────── */
function SummaryCard({ model, month }: { model: SettlementModel; month: string }) {
  const s = summarizePnl(model.items, model.cur.entries)
  const rows = [
    { label: '총 수입', value: s.income },
    { label: '총 지출', value: s.expense },
    { label: '월별 순이익', value: s.net },
    { label: '저축/투자/상환', value: s.saving },
  ]
  const rates = [
    { label: '저축/투자율', ratio: s.savingRate, color: 'var(--violet-700)' },
    { label: 'DSR', ratio: s.dsr, color: 'var(--cyan-500)' },
  ]
  return (
    <Card style={{ padding: 20 }} aria-label={`${month} 요약`}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--violet-700)', marginBottom: 4 }}>{month} 요약</div>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontSize: 14, color: 'var(--text-sub)' }}>{r.label}</span>
          <Money value={formatWon(r.value)} size={18} unitSize={12} />
        </div>
      ))}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          margin: '10px 0 16px',
          background: s.mismatch === 0 ? 'var(--surface-sub)' : 'var(--warn-bg)',
          borderRadius: 12,
        }}
      >
        <span style={{ fontSize: 13, color: s.mismatch === 0 ? 'var(--text-sub)' : 'var(--warn)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {s.mismatch !== 0 && <Icon name="warning" size={16} color="var(--warn)" strokeWidth={2} />}
          불일치하는 차액
        </span>
        <Money value={formatWon(s.mismatch)} size={16} unitSize={12} color={s.mismatch === 0 ? undefined : 'var(--warn)'} />
      </div>

      {rates.map((r, i) => (
        <div key={r.label} style={{ marginBottom: i === rates.length - 1 ? 0 : 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
            <span style={{ fontWeight: 600 }}>{r.label}</span>
            <b>{formatPct(r.ratio)}</b>
          </div>
          <ProgressBar pct={Number.isFinite(r.ratio) ? Math.min(100, r.ratio * 100) : 0} color={r.color} height={12} />
        </div>
      ))}

    </Card>
  )
}

/* ───────── 하단 확인·마감 바 ─────────
 * 스무스 스크롤 영역 밖(body)에 고정으로 렌더 */
function ConfirmBar({ model }: { model: SettlementModel }) {
  const { members, me } = useAuth()
  const rule = closeRule(model, members, me)
  const barRef = useRef<HTMLDivElement>(null)
  // 하단 상시 안내(SoloNotice)가 이 바 위에 뜨도록 높이를 알려 줌
  useCssHeight(barRef, '--fixed-bar-h')
  return (
    <FixedLayer>
      <div
        ref={barRef}
        className="fixed-bar-enter"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--surface)',
          borderTop: '1px solid var(--line)',
          boxShadow: '0 -8px 24px rgba(30,27,58,0.06)',
          zIndex: 5,
        }}
      >
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {rule.people.map((p) => (
            <span key={p.role} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <OwnerTag owner={p.label} />
              <span className="micro">{p.name}</span>
              <Badge tone={p.confirmed ? 'good' : 'neutral'}>{p.confirmed ? '확인 완료' : '확인 대기'}</Badge>
            </span>
          ))}
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-sub)' }}>{rule.hint}</span>
          {rule.closed ? (
            <Button variant="danger" onClick={() => window.confirm('마감을 해제할까요? 두 사람의 확인도 다시 받아야 해요.') && void model.reopen()}>
              마감 해제
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => void model.toggleConfirm()}>
                {rule.meConfirmed ? '내 확인 취소' : '확인했어요'}
              </Button>
              <Button disabled={!rule.canClose} onClick={() => void model.close()}>
                마감하기
              </Button>
            </>
          )}
        </div>
      </div>
    </FixedLayer>
  )
}

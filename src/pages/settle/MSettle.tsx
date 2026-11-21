import { useRef } from 'react'
import { useState, type ReactNode } from 'react'
import { useCssHeight } from '../../components/layout/SoloNotice'
import { Collapse } from '../../animation/Collapse'
import { FixedLayer } from '../../animation/SmoothScroll'
import { useAuth } from '../../auth/AuthProvider'
import { MFilterRow } from '../../components/layout/PageHead'
import { Badge, Button, Card, Dot, Icon, IconButton, OwnerTag, ProgressBar } from '../../components/ui'
import { groupTotal, sectorTotal, summarizePnl } from '../../data/compute'
import { addMonths, formatNumber, formatPct, formatWon, splitMonth } from '../../data/format'
import { SECTORS, type AccountKind, type PnlGroup } from '../../data/ledger'
import type { SettlementModel } from '../../data/useSettlement'
import { AddAccountForm } from './AddAccountForm'
import { ExcelUpload } from './ExcelUpload'
import { AmountInput, SaveStatus } from './parts'
import { closeRule, MONTH_BADGE, monthStatusOf, PNL_GROUP_TITLE } from './shared'

interface Props {
  model: SettlementModel
  month: string
  thisMonth: string
  onMonthChange: (m: string) => void
}

/** 섹션 머리 줄 (누르면 펼치기/접기) */
function SectionHead({ title, right, expanded, onToggle }: { title: string; right: ReactNode; expanded?: boolean; onToggle?: () => void }) {
  const content = (
    <>
      <b style={{ flex: 1, fontSize: 15, textAlign: 'left' }}>{title}</b>
      {right}
      {onToggle && <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={18} color="var(--text-sub)" />}
    </>
  )
  const rowStyle = { display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 } as const
  if (!onToggle) return <div style={rowStyle}>{content}</div>
  return (
    <button
      type="button"
      aria-expanded={expanded ?? false}
      onClick={onToggle}
      style={{ ...rowStyle, width: '100%', padding: 0, border: 'none', background: 'transparent', color: 'inherit' }}
    >
      {content}
    </button>
  )
}

/** 펼친 섹션 안 입력 행 */
function InputRow({ title, sub, subTone, children }: { title: string; sub?: string; subTone?: 'bad'; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderTop: '1px solid var(--line)', minHeight: 44 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {sub && (
          <div className="micro" style={{ marginTop: 2, color: subTone === 'bad' ? 'var(--bad)' : undefined, fontWeight: subTone === 'bad' ? 600 : undefined }}>
            {sub}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

/* ───────── 마스터 자산·부채 (모바일): 금액 입력 + 추가·빼기 ───────── */
function MasterSection({ model, open, onToggle }: { model: SettlementModel; open: boolean; onToggle: () => void }) {
  const [adding, setAdding] = useState(false)
  const groups: { kind: AccountKind; label: string }[] = [
    { kind: 'asset', label: '자산' },
    { kind: 'liability', label: '부채' },
  ]
  return (
    <Card pad="sm">
      <div data-amount-scope="">
        <SectionHead
          title="마스터 자산·부채"
          right={<span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{model.accounts.length}개</span>}
          expanded={open}
          onToggle={onToggle}
        />
        <Collapse open={open}>
          {model.accounts.length === 0 && !adding && (
            <p className="micro" style={{ padding: '4px 0 8px' }}>
              아직 등록한 자산·부채가 없어요.
            </p>
          )}
          {groups.map(({ kind, label }) => {
            const list = model.accounts.filter((a) => a.kind === kind)
            if (list.length === 0) return null
            return (
              <div key={kind}>
                <div className="label" style={{ padding: '10px 0 6px' }}>
                  {label} {list.length}
                </div>
                {list.map((a) => (
                  <InputRow
                    key={a.id}
                    title={a.name}
                    sub={`${a.category}${a.interestRate === null ? '' : ` · ${a.interestRate.toFixed(2)}%`}`}
                  >
                    <AmountInput
                      label={`${a.name} 금액`}
                      width={116}
                      value={model.cur.balances.get(a.id)}
                      disabled={model.locked}
                      onCommit={(n) => void model.setBalance(a.id, n)}
                    />
                    <IconButton
                      icon="close"
                      label={`${a.name} 목록에서 빼기`}
                      iconSize={18}
                      disabled={model.locked}
                      onClick={() => {
                        if (window.confirm(`'${a.name}'을(를) 목록에서 뺄까요? 지난 결산 기록은 그대로 남아요.`)) void model.removeAccount(a.id)
                      }}
                    />
                  </InputRow>
                ))}
              </div>
            )
          })}
          {adding ? (
            <AddAccountForm
              kind="asset"
              layout="m"
              onCancel={() => setAdding(false)}
              onAdd={(a) => model.addAccount(a).then(() => setAdding(false))}
            />
          ) : (
            <Button variant="soft" block style={{ margin: '8px 0 4px' }} disabled={model.locked} onClick={() => setAdding(true)}>
              + 자산·부채 추가
            </Button>
          )}
        </Collapse>
      </div>
    </Card>
  )
}

export function MSettle({ model, month, thisMonth, onMonthChange }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({ income: true })
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }))
  const s = summarizePnl(model.items, model.cur.entries)
  const status = monthStatusOf(model)
  const groups: PnlGroup[] = ['income', 'fixed', 'variable', 'saving']
  // 이번 달까지 최근 8개월
  const months = Array.from({ length: 8 }, (_, i) => addMonths(thisMonth, i - 7))
  const masterInvest = model.accounts
    .filter((a) => a.kind === 'asset' && a.category === '금융투자')
    .reduce((sum, a) => sum + (model.cur.balances.get(a.id) ?? 0), 0)
  const inputSectorTotal = sectorTotal(model.cur)
  const sectorOk = masterInvest === inputSectorTotal

  return (
    <>
      {/* 월 선택 */}
      <MFilterRow>
        {months.map((key) => {
          const { month: m } = splitMonth(key)
          const selected = key === month
          const badge = MONTH_BADGE[model.statusByMonth.get(key) ?? 'none']
          return (
            <button
              key={key}
              type="button"
              aria-current={selected ? 'date' : undefined}
              aria-label={`${m}월 ${badge.text}`}
              onClick={() => onMonthChange(key)}
              style={{
                flexShrink: 0,
                width: 64,
                minHeight: 64,
                borderRadius: 14,
                border: selected ? '2px solid var(--violet-700)' : '1px solid var(--line)',
                background: selected ? 'var(--violet-100)' : 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                color: 'var(--text)',
              }}
            >
              <b style={{ fontSize: 14 }}>{m}월</b>
              <Dot color={badge.dot} />
            </button>
          )
        })}
      </MFilterRow>

      <ExcelUpload model={model} month={month} onMonthChange={onMonthChange} variant="m" />

      {model.save.kind !== 'idle' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 13, color: 'var(--text-sub)', alignItems: 'center' }}>
          <SaveStatus save={model.save} />
        </div>
      )}

      {model.loadError && (
        <Card pad="md">
          <p role="alert" style={{ color: 'var(--bad)', fontWeight: 600 }}>
            {model.loadError}
          </p>
          <Button variant="secondary" block style={{ marginTop: 12 }} onClick={() => void model.reload()}>
            다시 불러오기
          </Button>
        </Card>
      )}

      {/* 요약 */}
      <Card pad="md">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b style={{ fontSize: 15 }}>{month} 요약</b>
          <Badge tone={MONTH_BADGE[status].tone}>{MONTH_BADGE[status].text}</Badge>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12, margin: '14px 0' }}>
          {[
            ['총 수입', s.income],
            ['총 지출', s.expense],
            ['월별 순이익', s.net],
            ['저축/투자/상환', s.saving],
          ].map(([label, value]) => (
            <div key={label as string}>
              <div className="label">{label}</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                {formatWon(value as number)}
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-sub)' }}>원</span>
              </div>
            </div>
          ))}
        </div>
        {s.mismatch !== 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--warn-bg)', borderRadius: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: 'var(--warn)', fontWeight: 600 }}>불일치하는 차액</span>
            <b style={{ color: 'var(--warn)' }}>{formatNumber(s.mismatch)}원</b>
          </div>
        )}
        {[
          { label: '저축/투자율', ratio: s.savingRate, color: 'var(--violet-700)' },
          { label: 'DSR', ratio: s.dsr, color: 'var(--cyan-500)' },
        ].map((r, i) => (
          <div key={r.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, margin: i === 0 ? '0 0 4px' : '10px 0 4px' }}>
              <span>{r.label}</span>
              <b>{formatPct(r.ratio)}</b>
            </div>
            <ProgressBar pct={Number.isFinite(r.ratio) ? Math.min(100, r.ratio * 100) : 0} color={r.color} height={8} />
          </div>
        ))}
      </Card>

      {/* 손익 입력 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>손익 입력</h2>
        <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>항목을 누르면 펼쳐져요</span>
      </div>

      {groups.map((g) => (
        <Card key={g} pad="sm">
          <div data-amount-scope="">
            <SectionHead
              title={PNL_GROUP_TITLE[g]}
              right={<span style={{ fontSize: 14, fontWeight: 600 }}>{formatWon(groupTotal(model.items, model.cur.entries, g))}</span>}
              expanded={open[g]}
              onToggle={() => toggle(g)}
            />
            <Collapse open={Boolean(open[g])}>
              {model.items
                .filter((i) => i.grp === g)
                .map((it) => {
                  const p = model.prev.entries.get(it.id)
                  return (
                    <InputRow key={it.id} title={it.name} sub={`지난달 ${p === undefined ? '–' : `${formatWon(p)}원`}`}>
                      <AmountInput label={`${it.name} 이번 달 금액`} width={128} value={model.cur.entries.get(it.id)} disabled={model.locked} onCommit={(n) => void model.setEntry(it.id, n)} />
                    </InputRow>
                  )
                })}
            </Collapse>
          </div>
        </Card>
      ))}

      <Card pad="sm">
        <div data-amount-scope="">
          <SectionHead
            title="(5) 마감 환율"
            right={
              <AmountInput
                label="마감 환율 원/달러"
                decimal
                width={110}
                value={model.settlement?.fxRate ?? undefined}
                disabled={model.locked}
                onCommit={(n) => void model.setFx(n === 0 ? null : n)}
              />
            }
          />
        </div>
      </Card>

      <MasterSection model={model} open={Boolean(open.master)} onToggle={() => toggle('master')} />

      {/* 금융투자 섹터 비중 */}
      <Card pad="sm">
        <div data-amount-scope="">
          <SectionHead
            title="금융투자 섹터 비중"
            right={<Badge tone={sectorOk ? 'good' : 'warn'}>{sectorOk ? '총액 일치' : '총액 불일치'}</Badge>}
            expanded={open.sector}
            onToggle={() => toggle('sector')}
          />
          <Collapse open={Boolean(open.sector)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '10px 12px', margin: '4px 0 8px', borderRadius: 12, background: sectorOk ? 'var(--good-bg)' : 'var(--warn-bg)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-sub)' }}>
                금융투자 총액 <b style={{ color: 'var(--text)' }}>{formatWon(masterInvest)}</b>
              </span>
              <span style={{ color: sectorOk ? 'var(--good)' : 'var(--warn)', fontWeight: 600 }}>
                {sectorOk ? '일치' : `차액 ${formatNumber(masterInvest - inputSectorTotal)}`}
              </span>
            </div>
            {SECTORS.map((sec) => {
              const amount = model.cur.sectors.get(sec)
              return (
                <InputRow key={sec} title={sec} sub={inputSectorTotal > 0 ? `비중 ${Math.round(((amount ?? 0) / inputSectorTotal) * 100)}%` : undefined}>
                  <AmountInput label={`${sec} 금액`} width={128} value={amount} disabled={model.locked} onCommit={(n) => void model.setSector(sec, n)} />
                </InputRow>
              )
            })}
          </Collapse>
        </div>
      </Card>

      {/* 하단 고정 확인 바에 가려지지 않도록 여백 */}
      <div aria-hidden="true" style={{ height: 68, flexShrink: 0 }} />

      <MConfirmBar model={model} />
    </>
  )
}

/* ───────── 하단 탭 위 고정 확인 바 ───────── */
function MConfirmBar({ model }: { model: SettlementModel }) {
  const { members, me } = useAuth()
  const rule = closeRule(model, members, me)
  const barRef = useRef<HTMLDivElement>(null)
  // 하단 상시 안내(SoloNotice)가 이 바 위에 뜨도록 높이를 알려 줌
  useCssHeight(barRef, '--fixed-bar-h')
  // 스무스 스크롤 영역 밖(body)에 고정으로 렌더
  return (
    <FixedLayer>
      <div
        ref={barRef}
        className="fixed-bar-enter"
        style={{ position: 'fixed', left: 0, right: 0, bottom: 84, zIndex: 15, padding: '12px 16px', background: 'linear-gradient(rgba(245,245,251,0), var(--bg) 30%)' }}
      >
        <div style={{ background: 'var(--surface)', borderRadius: 18, boxShadow: 'var(--shadow-card)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, alignItems: 'center', flexWrap: 'wrap' }}>
            {rule.people.map((p) => (
              <span key={p.role} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <OwnerTag owner={p.label} />
                <Badge tone={p.confirmed ? 'good' : 'neutral'}>{p.confirmed ? '확인 완료' : '대기'}</Badge>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {rule.closed ? (
              <Button variant="danger" block onClick={() => window.confirm('마감을 해제할까요? 두 사람의 확인도 다시 받아야 해요.') && void model.reopen()}>
                마감 해제
              </Button>
            ) : rule.canClose ? (
              <>
                <Button variant="secondary" block onClick={() => void model.toggleConfirm()}>
                  내 확인 취소
                </Button>
                <Button block onClick={() => void model.close()}>
                  마감하기
                </Button>
              </>
            ) : (
              <Button block variant={rule.meConfirmed ? 'secondary' : 'primary'} onClick={() => void model.toggleConfirm()}>
                {rule.meConfirmed ? '내 확인 취소' : '확인 완료'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </FixedLayer>
  )
}

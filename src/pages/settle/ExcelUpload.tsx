import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../auth/AuthProvider'
import { Badge, Button, Icon, IconButton, Select } from '../../components/ui'
import { applyImport, parseMasterFile, planImport, type ExcelMonth, type ImportPlan } from '../../data/excelImport'
import { formatWon } from '../../data/format'
import { fetchAccounts, fetchPnlItems, type Account, type PnlItem } from '../../data/ledger'
import type { SettlementModel } from '../../data/useSettlement'
import { toKoreanError } from '../../lib/supabase'
import { PNL_GROUP_TITLE } from './shared'

interface Props {
  model: SettlementModel
  month: string
  onMonthChange: (m: string) => void
  /** pc = 제목 줄 버튼 · m = 모바일 가로 꽉 찬 버튼 */
  variant?: 'pc' | 'm'
}

interface Parsed {
  fileName: string
  months: ExcelMonth[]
  accounts: Account[]
  items: PnlItem[]
}

/** 월별 결산 · 백데이터 엑셀 업로드 (파일은 브라우저 안에서만 읽음) */
export function ExcelUpload({ model, month, onMonthChange, variant = 'pc' }: Props) {
  const { household } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [selected, setSelected] = useState(month)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null)
  /** 새 항목이 있을 때 '추가할까요?' 확인 단계 */
  const [asking, setAsking] = useState(false)

  const onFile = async (file: File | undefined) => {
    if (!file || !household) return
    setBusy(true)
    setError(null)
    try {
      const [months, accounts, items] = await Promise.all([
        parseMasterFile(file),
        fetchAccounts(household.id, { includeArchived: true }),
        fetchPnlItems(household.id),
      ])
      setParsed({ fileName: file.name, months, accounts, items })
      // 보고 있는 달이 파일에 있으면 그 달, 없으면 파일의 가장 최근 달
      setSelected(months.some((m) => m.month === month) ? month : months[months.length - 1].month)
    } catch (e) {
      setParsed({ fileName: file.name, months: [], accounts: [], items: [] })
      setError(e instanceof Error ? e.message : toKoreanError(e))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const close = () => {
    setParsed(null)
    setError(null)
    setAsking(false)
  }

  const data = parsed?.months.find((m) => m.month === selected)
  const plan: ImportPlan | null = data && parsed ? planImport(data, parsed.accounts, parsed.items) : null
  const closed = model.statusByMonth.get(selected) === 'closed'

  /** addNew = false면 새 항목(과 그 값)은 빼고 나머지만 반영 */
  const apply = async (addNew: boolean) => {
    if (!plan || !household) return
    const run: ImportPlan = addNew ? plan : { ...plan, newAccounts: [], newItems: [], valueCount: plan.valueCount - newCount }
    setBusy(true)
    setError(null)
    try {
      await applyImport(household.id, run)
      const added = run.newAccounts.length + run.newItems.length
      setToast({
        title: `${selected} 결산에 엑셀 값을 반영했어요`,
        detail: `값 ${run.valueCount}개${added > 0 ? ` · 새 항목 ${added}개 추가` : ''}${!addNew && newCount > 0 ? ` · 새 항목 ${newCount}개는 제외` : ''}`,
      })
      close()
      if (selected !== month) onMonthChange(selected)
      else await model.reload()
    } catch (e) {
      setError(e instanceof Error && !('code' in e) ? e.message : toKoreanError(e))
    } finally {
      setBusy(false)
    }
  }

  const newCount = plan ? plan.newAccounts.length + plan.newItems.length : 0

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <Button
        variant="secondary"
        size={variant === 'pc' ? 'header' : 'md'}
        icon="upload"
        block={variant === 'm'}
        style={variant === 'pc' ? { padding: '0 14px' } : undefined}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy && !parsed ? '엑셀 읽는 중…' : '엑셀 업로드'}
      </Button>

      {toast && <Toast title={toast.title} detail={toast.detail} onDone={() => setToast(null)} />}

      {parsed && (
        <Dialog title="엑셀 업로드" onClose={close}>
          <div className="micro" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, wordBreak: 'break-all' }}>
            <Icon name="upload" size={14} color="var(--text-sub)" />
            {parsed.fileName}
          </div>

          {parsed.months.length > 0 && (
            <>
              <Select
                id="excel-month"
                label="반영할 결산월"
                value={selected}
                onChange={(v) => {
                  setSelected(v)
                  setAsking(false)
                }}
                options={[...parsed.months].reverse().map((m) => ({
                  value: m.month,
                  label: `${m.month}${model.statusByMonth.get(m.month) === 'closed' ? ' · 마감됨' : ''}`,
                }))}
              />
              {plan && (
                <p style={{ fontSize: 14, lineHeight: 1.6, margin: '14px 0 0' }}>
                  엑셀의 <b>{selected}</b> 값 <b>{plan.valueCount}개</b>를 이 달 결산에 반영해요.
                  <br />
                  <span className="micro">이미 입력된 값은 엑셀 값으로 바뀌어요. 섹터 금액은 비중 × 금융투자 총액으로 계산해요.</span>
                </p>
              )}

              {plan && newCount > 0 && (
                <div
                  role="status"
                  style={{ marginTop: 16, padding: '12px 14px', borderRadius: 14, background: 'var(--warn-bg)', border: '1px solid var(--warn-fill)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14, color: 'var(--warn)' }}>
                    <Icon name="warning" size={16} color="var(--warn)" strokeWidth={2} />
                    기존 양식에 없던 새 항목 {newCount}개
                  </div>
                  <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                    {plan.newAccounts.map((a) => (
                      <li key={`a-${a.kind}-${a.name}`} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                        <Badge tone="info">{a.kind === 'asset' ? '자산' : '부채'}</Badge>
                        <span style={{ flex: 1 }}>
                          {a.name} <span className="micro">· {a.category}</span>
                        </span>
                        <b>{formatWon(a.amount)}원</b>
                      </li>
                    ))}
                    {plan.newItems.map((it) => (
                      <li key={`i-${it.grp}-${it.name}`} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                        <Badge tone="info">{PNL_GROUP_TITLE[it.grp].replace(/^\(\d\)\s*/, '')}</Badge>
                        <span style={{ flex: 1 }}>{it.name}</span>
                        <b>{formatWon(it.amount)}원</b>
                      </li>
                    ))}
                  </ul>
                  <div className="micro" style={{ marginTop: 10 }}>
                    가져오기를 누르면 이 항목들을 새로 추가할지 물어볼게요.
                  </div>
                </div>
              )}

              {closed && (
                <p role="alert" style={{ marginTop: 14, fontSize: 13, color: 'var(--bad)', fontWeight: 600 }}>
                  {selected} 결산은 마감되어 있어요. 월별 결산에서 마감을 해제한 뒤 다시 올려 주세요.
                </p>
              )}
            </>
          )}

          {error && (
            <p role="alert" style={{ marginTop: 14, fontSize: 13, color: 'var(--bad)', fontWeight: 600 }}>
              {error}
            </p>
          )}

          {asking && plan ? (
            // 새 항목 확인: "○○을 새로운 항목으로 추가할까요?"
            <div role="alertdialog" aria-labelledby="excel-new-q" style={{ marginTop: 20, padding: 16, borderRadius: 14, background: 'var(--violet-100)' }}>
              <p id="excel-new-q" style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.5, wordBreak: 'keep-all' }}>
                {newItemQuestion(plan)}
              </p>
              <p className="micro" style={{ margin: '6px 0 0' }}>
                '아니요'를 누르면 새 항목 값은 빼고 나머지 값만 반영해요.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <Button variant="secondary" block onClick={() => void apply(false)} disabled={busy}>
                  아니요
                </Button>
                <Button block onClick={() => void apply(true)} disabled={busy} autoFocus>
                  {busy ? '반영 중…' : '예'}
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <Button variant="secondary" block onClick={close} disabled={busy}>
                취소
              </Button>
              {parsed.months.length > 0 && (
                <Button block onClick={() => (newCount > 0 ? setAsking(true) : void apply(true))} disabled={busy || !plan || closed}>
                  {busy ? '가져오는 중…' : '가져오기'}
                </Button>
              )}
            </div>
          )}
        </Dialog>
      )}
    </>
  )
}

/** 받침이 있으면 '을', 없으면 '를' (한글이 아니면 '을(를)') */
function objectParticle(word: string): string {
  const code = word.trim().charCodeAt(word.trim().length - 1)
  if (code < 0xac00 || code > 0xd7a3) return '을(를)'
  return (code - 0xac00) % 28 === 0 ? '를' : '을'
}

/** "‘A’, ‘B’을 새로운 항목으로 추가할까요?" */
function newItemQuestion(plan: ImportPlan): string {
  const names = [...plan.newAccounts.map((a) => a.name), ...plan.newItems.map((i) => i.name)]
  const shown = names.length > 3 ? names.slice(0, 3) : names
  const list = shown.map((n) => `‘${n}’`).join(', ')
  const tail = names.length > 3 ? ` 외 ${names.length - 3}개를` : objectParticle(shown[shown.length - 1])
  return `${list}${tail} 새로운 항목으로 추가할까요?`
}

/** 완료 알림: 3.5초 뒤 사라짐 (화면 낭독기에도 읽힘) */
function Toast({ title, detail, onDone }: { title: string; detail: string; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  // 화면이 다시 그려져도 타이머가 처음부터 다시 시작되지 않도록 처음 한 번만
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const t1 = window.setTimeout(() => setLeaving(true), 3500)
    const t2 = window.setTimeout(() => doneRef.current(), 3800)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [])
  return createPortal(
    <div role="status" aria-live="polite" className={leaving ? 'toast toast--out' : 'toast'}>
      <Icon name="check" size={18} color="var(--good)" strokeWidth={2.5} />
      <span>
        {title}
        <small>{detail}</small>
      </span>
    </div>,
    document.body,
  )
}

/** 가운데 대화상자 (모바일은 아래에서 올라오는 시트) */
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="sheet" style={{ maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="sheet__grip" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <b style={{ fontSize: 19 }}>{title}</b>
          <IconButton icon="close" label="닫기" iconSize={20} onClick={onClose} />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

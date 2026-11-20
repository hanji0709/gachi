import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Button, ChoiceChips, IconButton, Segmented } from '../ui'

interface QuickInputCtx {
  open: () => void
}

const Ctx = createContext<QuickInputCtx>({ open: () => {} })

export function useQuickInput() {
  return useContext(Ctx)
}

export function QuickInputProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  return (
    <Ctx.Provider value={{ open: () => setOpen(true) }}>
      {children}
      {isOpen && <QuickInputSheet onClose={() => setOpen(false)} />}
    </Ctx.Provider>
  )
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫']

/** 빠른 입력 (모바일: 하단 시트 · PC: 가운데 대화상자) — UI만, 저장 기능 없음 */
function QuickInputSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="빠른 입력" className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__grip" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 }}>
          <b style={{ fontSize: 19 }}>빠른 입력</b>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>2026-10 결산 · 진행 중</span>
            <IconButton icon="close" label="닫기" iconSize={20} onClick={onClose} />
          </span>
        </div>

        <Segmented label="입력 종류" options={['결산 항목', '자산·부채', '이번 달만', '고정 항목']} size="sm" block />

        <div className="label" style={{ margin: '16px 0 8px' }}>
          항목 · 최근 고친 순
        </div>
        <div className="m-filter-row">
          <ChoiceChips label="항목" options={['카페', '마트·편의점', '생활', '식비', '개인용돈']} />
        </div>

        <div
          style={{
            margin: '18px 0 6px',
            padding: '14px 16px',
            borderRadius: 16,
            border: '2px solid var(--violet-700)',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 14, color: 'var(--text-sub)' }}>카페 · 이번 달</span>
          <span style={{ fontSize: 30, fontWeight: 700 }}>
            12,345<span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text-sub)' }}>원</span>
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-sub)', marginBottom: 12 }}>
          지난달 23,456원 · 예산 30,000원 중 17,655원 남음
        </div>

        <div className="keypad">
          {KEYS.map((k) => (
            <button key={k} type="button" className="keypad__key" aria-label={k === '⌫' ? '지우기' : undefined}>
              {k}
            </button>
          ))}
        </div>

        <Button block style={{ minHeight: 52 }}>
          저장
        </Button>
      </div>
    </div>
  )
}

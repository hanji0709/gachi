import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from '../../components/ui'

/**
 * 느낌표(ⓘ) 아이콘 + 안내 레이어 팝업
 * - PC: 마우스를 올리면 열림, 벗어나면 닫힘
 * - 모바일: 누르면 열림, 다시 누르거나 바깥을 누르면 닫힘
 * - 키보드: Tab으로 포커스하면 열림, Esc로 닫힘 (내용은 화면 낭독기가 읽음)
 */
export function InfoTip({ label, text, color = 'var(--text-sub)', size = 18 }: { label: string; text: string; color?: string; size?: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex' }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        type="button"
        aria-label={`${label} 설명`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{ display: 'inline-flex', padding: 4, margin: -4, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 8 }}
      >
        <Icon name="info" size={size} color={color} />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="chart-tip"
          style={{ left: 'auto', right: -8, top: 'calc(100% + 10px)', width: 'min(300px, 80vw)', maxWidth: 'none', fontSize: 13, lineHeight: 1.55, whiteSpace: 'normal', textAlign: 'left', fontWeight: 400, color: 'var(--text)' }}
        >
          <b style={{ display: 'block', marginBottom: 4 }}>{label}</b>
          {text}
        </span>
      )}
    </span>
  )
}

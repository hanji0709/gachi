import { useId, useState, type CSSProperties } from 'react'
import { Collapse } from '../../animation/Collapse'
import { ProgressBar } from '../../components/ui'
import { formatPct, formatWon } from '../../data/format'
import type { FlowGroup } from './shared'
import './pnl.css'

/** 모바일 "수입 흐름표" 들여쓰기 트리 */

interface NodeProps {
  label: string
  amount: string
  pct: string
  /** 0 = 총 수입, 1 = 지출·저축, 2 = 세부 항목 */
  level: 0 | 1 | 2
  /** 펼침 표시: 'open' ▾ · 'closed' ▸ · 없음 */
  chevron?: 'open' | 'closed'
  /** 비중 막대(%) — 없으면 막대 생략 */
  barPct?: number
  barColor?: string
  /** root = 총 수입 강조, warn = 불일치 차액 */
  emphasis?: 'root' | 'warn'
  /** 있으면 노드 전체가 펼치기/접기 버튼이 됨 */
  onToggle?: () => void
  /** onToggle과 함께: 펼쳐지는 영역의 id */
  controls?: string
}

const connector: CSSProperties = {
  position: 'absolute',
  left: -12,
  top: 0,
  bottom: '50%',
  width: 12,
  borderLeft: '2px solid var(--line-strong)',
  borderBottom: '2px solid var(--line-strong)',
  borderBottomLeftRadius: 8,
}

function FlowNode({ label, amount, pct, level, chevron, barPct, barColor, emphasis, onToggle, controls }: NodeProps) {
  const small = level === 2
  const border =
    emphasis === 'root'
      ? '2px solid var(--violet-700)'
      : emphasis === 'warn'
        ? '2px solid var(--warn-fill)'
        : '1px solid var(--line)'
  const boxStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    background: emphasis === 'root' ? 'var(--violet-100)' : 'var(--surface)',
    border,
    borderRadius: 14,
    padding: '10px 12px',
    minHeight: 44,
    boxSizing: 'border-box',
    textAlign: 'left',
    font: 'inherit',
    color: 'inherit',
  }
  const body = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <b style={{ flex: 1, fontSize: small ? 14 : 15 }}>{label}</b>
        <span style={{ fontSize: small ? 13 : 14, fontWeight: 600 }}>{amount}</span>
        <span style={{ fontSize: 12, color: 'var(--text-sub)', width: 42, textAlign: 'right' }}>{pct}</span>
        <span
          aria-hidden="true"
          className={chevron ? `flow-chevron${chevron === 'open' ? ' is-open' : ''}` : undefined}
          style={{ color: 'var(--text-sub)', width: 12 }}
        >
          {chevron ? '▸' : null}
        </span>
      </div>
      {barPct !== undefined && (
        <div style={{ marginTop: 6 }}>
          <ProgressBar pct={barPct} color={barColor} height={4} />
        </div>
      )}
    </>
  )
  return (
    <div style={{ marginLeft: level * 20, position: 'relative' }}>
      {level > 0 && <span aria-hidden="true" style={connector} />}
      {onToggle ? (
        <button
          type="button"
          className="flow-node-btn"
          aria-expanded={chevron === 'open'}
          aria-controls={controls}
          onClick={onToggle}
          style={boxStyle}
        >
          {body}
        </button>
      ) : (
        <div style={boxStyle}>{body}</div>
      )}
    </div>
  )
}

const listStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
/** 처음 보여 줄 세부 항목 수 (나머지는 더보기) */
const FIRST = 4

/** 지출·저축 그룹 하나 + 펼치는 세부 항목 */
function GroupNode({ g, open, onToggle }: { g: FlowGroup; open: boolean; onToggle: () => void }) {
  const [more, setMore] = useState(false)
  const id = useId()
  const moreId = useId()
  const toggleable = g.details.length > 0
  const row = (d: FlowGroup['details'][number]) => (
    <FlowNode key={d.name} label={d.name} amount={formatWon(d.amount)} pct={formatPct(d.share, 1)} level={2} barPct={Math.min(100, d.share * 100)} barColor="var(--violet-300)" />
  )
  const head = g.details.slice(0, FIRST)
  const rest = g.details.slice(FIRST)
  return (
    <>
      <FlowNode
        label={g.label}
        amount={formatWon(g.amount)}
        pct={formatPct(g.share, 1)}
        level={1}
        chevron={toggleable ? (open ? 'open' : 'closed') : undefined}
        barPct={g.key === 'mismatch' ? undefined : Math.min(100, Math.abs(g.share) * 100)}
        barColor="var(--violet-700)"
        emphasis={g.key === 'mismatch' ? 'warn' : undefined}
        onToggle={toggleable ? onToggle : undefined}
        controls={toggleable ? id : undefined}
      />
      {toggleable && (
        // 아래로 펼쳐지고 위로 접힘
        <Collapse open={open} id={id} style={{ marginTop: -8 }} innerStyle={{ ...listStyle, paddingTop: 8 }}>
          {head.map(row)}
          {rest.length > 0 && (
            <>
              {/* 접혀 있을 때 목록 gap(6px)이 두 번 생기지 않도록 위 간격을 안쪽 여백으로 옮김 */}
              <Collapse open={more} id={moreId} style={{ marginTop: -6 }} innerStyle={{ ...listStyle, paddingTop: 6 }}>
                {rest.map(row)}
              </Collapse>
              <button
                type="button"
                aria-expanded={more}
                aria-controls={moreId}
                onClick={() => setMore((v) => !v)}
                style={{
                  marginLeft: 40,
                  fontSize: 13,
                  color: 'var(--violet-700)',
                  fontWeight: 600,
                  padding: '8px 0',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                {more ? '− 접기' : `+ 나머지 ${rest.length}개 더보기`}
              </button>
            </>
          )}
        </Collapse>
      )}
    </>
  )
}

export function MFlowTree({ income, groups }: { income: number; groups: FlowGroup[] }) {
  const [openKey, setOpenKey] = useState<FlowGroup['key'] | null>('fixed')
  return (
    <>
      <FlowNode label="총 수입" amount={formatWon(income)} pct="100.0%" level={0} emphasis="root" />
      <div style={{ height: 8 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 12, borderLeft: '2px solid var(--line-strong)', paddingLeft: 0 }}>
        {groups.map((g) => (
          <GroupNode key={g.key} g={g} open={openKey === g.key} onToggle={() => setOpenKey((k) => (k === g.key ? null : g.key))} />
        ))}
      </div>
    </>
  )
}

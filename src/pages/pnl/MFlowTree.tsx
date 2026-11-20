import { useId, useState, type CSSProperties } from 'react'
import { Collapse } from '../../animation/Collapse'
import { ProgressBar } from '../../components/ui'
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

const TOTAL_INCOME = 31592590

/** 고정지출 세부 항목: 처음 3개는 바로, 나머지 4개는 "더보기"로 */
const FIXED_DETAILS = [
  { label: '대출 원금', amount: '7,037,034', pct: '22.3%' },
  { label: '대출 이자', amount: '3,703,701', pct: '11.7%' },
  { label: '개인용돈', amount: '3,703,701', pct: '11.7%' },
]
const MORE_DETAILS = [
  { label: '차량임차료', amount: '3,370,368', pct: '10.7%' },
  { label: '아파트관리비', amount: '1,037,034', pct: '3.3%' },
  { label: '보험료', amount: '703,701', pct: '2.2%' },
  { label: '통신비', amount: '370,368', pct: '1.2%' },
]
const barPctOf = (amount: string) => (Number(amount.replace(/,/g, '')) / TOTAL_INCOME) * 100

const listStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }

export function MFlowTree() {
  const [fixedOpen, setFixedOpen] = useState(true)
  const [moreOpen, setMoreOpen] = useState(false)
  const fixedId = useId()
  const moreId = useId()

  return (
    <>
      <FlowNode label="총 수입" amount="31,592,590" pct="100.0%" level={0} emphasis="root" />
      <div style={{ height: 8 }} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginLeft: 12,
          borderLeft: '2px solid var(--line-strong)',
          paddingLeft: 0,
        }}
      >
        <FlowNode
          label="고정지출"
          amount="19,740,741"
          pct="62.5%"
          level={1}
          chevron={fixedOpen ? 'open' : 'closed'}
          barPct={62.48535178660566}
          barColor="var(--violet-700)"
          onToggle={() => setFixedOpen((v) => !v)}
          controls={fixedId}
        />
        {/* 고정지출 세부: 아래로 펼쳐지고 위로 접힘 */}
        <Collapse open={fixedOpen} id={fixedId} style={{ marginTop: -8 }} innerStyle={{ ...listStyle, paddingTop: 8 }}>
          {FIXED_DETAILS.map((d) => (
            <FlowNode key={d.label} {...d} level={2} barPct={barPctOf(d.amount)} barColor="var(--violet-300)" />
          ))}
          {/* 접혀 있을 때 목록 gap(6px)이 두 번 생기지 않도록 위 간격을 안쪽 여백으로 옮김 */}
          <Collapse open={moreOpen} id={moreId} style={{ marginTop: -6 }} innerStyle={{ ...listStyle, paddingTop: 6 }}>
            {MORE_DETAILS.map((d) => (
              <FlowNode key={d.label} {...d} level={2} barPct={barPctOf(d.amount)} barColor="var(--violet-300)" />
            ))}
          </Collapse>
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls={moreId}
            onClick={() => setMoreOpen((v) => !v)}
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
            {moreOpen ? '− 접기' : `+ 나머지 ${MORE_DETAILS.length}개 더보기`}
          </button>
        </Collapse>
        <FlowNode
          label="변동지출"
          amount="556,788"
          pct="1.8%"
          level={1}
          chevron="closed"
          barPct={1.7624006135615977}
          barColor="var(--violet-700)"
        />
        <FlowNode
          label="저축/투자/상환"
          amount="10,370,367"
          pct="32.8%"
          level={1}
          chevron="closed"
          barPct={32.82531441708325}
          barColor="var(--violet-700)"
        />
        <FlowNode label="불일치하는 차액" amount="924,694" pct="2.9%" level={1} emphasis="warn" />
      </div>
    </>
  )
}

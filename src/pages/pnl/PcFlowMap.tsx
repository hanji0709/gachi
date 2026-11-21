import { useRef, useState, type KeyboardEvent } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from '../../animation/gsap'
import { formatPct, formatWon } from '../../data/format'
import type { FlowGroup } from './shared'
import './pnl.css'

/** PC "수입 흐름표" 흐름 마인드맵 (SVG): 총 수입 → 지출·저축 → 펼친 그룹의 세부 항목 */

const NODE_GAP = 110
const DETAIL_GAP = 52
const MIN_H = 470
/** 선 두께: 총 수입 대비 비중 → 1.5 ~ 18px */
const linkWidth = (share: number) => Math.max(1.5, Math.min(18, Math.abs(share) * 28))

interface Props {
  income: number
  incomeSub: string
  groups: FlowGroup[]
}

export function PcFlowMap({ income, incomeSub, groups }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  // 한 번에 한 그룹만 펼침 (처음엔 고정지출)
  const [openKey, setOpenKey] = useState<FlowGroup['key'] | null>('fixed')
  const open = groups.find((g) => g.key === openKey && g.details.length > 0) ?? null
  const details = open?.details ?? []

  const H = Math.max(MIN_H, groups.length * NODE_GAP + 30, details.length * DETAIL_GAP + 60)
  const mid = H / 2
  const nodeY = (i: number) => mid + (i - (groups.length - 1) / 2) * NODE_GAP
  const detailY = (i: number) => mid + (i - (details.length - 1) / 2) * DETAIL_GAP
  const openY = open ? nodeY(groups.indexOf(open)) : mid

  // 펼칠 때: 연결선이 그려지고 → 상자가 오른쪽으로 미끄러져 나옴 (위에서부터)
  useGSAP(
    () => {
      if (prefersReducedMotion() || !open) return
      gsap.fromTo('.flow-detail__link', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.4, stagger: 0.03, ease: 'power2.out' })
      gsap.fromTo('.flow-detail__box', { autoAlpha: 0, x: -36 }, { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.03, delay: 0.15, ease: 'power2.out' })
    },
    { scope: svgRef, dependencies: [openKey, income], revertOnUpdate: true },
  )

  const toggle = (key: FlowGroup['key']) => setOpenKey((cur) => (cur === key ? null : key))
  const onKeyDown = (key: FlowGroup['key']) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggle(key)
    }
  }

  return (
    <svg ref={svgRef} viewBox={`0 0 1180 ${H}`} width="100%" role="group" aria-label="수입에서 지출 저축으로 이어지는 흐름 마인드맵" style={{ display: 'block' }}>
      {/* 총 수입 */}
      <rect x={24} y={mid - 40} width={200} height={80} rx={16} fill="var(--violet-100)" stroke="var(--violet-700)" strokeWidth={2} />
      <text x={42} y={mid - 10} fontSize={15} fontWeight={700} fill="var(--text)">
        총 수입
      </text>
      <text x={42} y={mid + 16} fontSize={17} fontWeight={700} fill="var(--text)">
        {formatWon(income)}원
      </text>
      <text x={210} y={mid - 10} textAnchor="end" fontSize={12} fill="var(--violet-700)" fontWeight={600}>
        100%
      </text>
      <text x={24} y={mid + 62} fontSize={12} fill="var(--text-sub)">
        {incomeSub}
      </text>

      {/* 1단계: 지출·저축 (세부 항목이 있으면 펼치기 버튼) */}
      {groups.map((g, i) => {
        const cy = nodeY(i)
        const toggleable = g.details.length > 0
        const isOpen = open?.key === g.key
        const warn = g.key === 'mismatch'
        return (
          <g key={g.key}>
            <path d={`M224 ${mid} C264 ${mid} 260 ${cy} 300 ${cy}`} fill="none" stroke="var(--line-strong)" strokeWidth={linkWidth(g.share)} strokeOpacity={0.7} />
            <g
              {...(toggleable
                ? {
                    className: 'flow-toggle',
                    role: 'button',
                    tabIndex: 0,
                    'aria-expanded': isOpen,
                    'aria-label': `${g.label} 세부 항목 ${isOpen ? '접기' : '펼치기'}`,
                    onClick: () => toggle(g.key),
                    onKeyDown: onKeyDown(g.key),
                  }
                : {})}
            >
              {toggleable && <rect className="flow-toggle__ring" x={296} y={cy - 32} width={238} height={64} rx={17} fill="none" stroke="var(--violet-700)" strokeWidth={2} />}
              <rect
                className="flow-toggle__box"
                x={300}
                y={cy - 28}
                width={230}
                height={56}
                rx={14}
                fill="#FFFFFF"
                stroke={warn ? 'var(--warn-fill)' : isOpen ? 'var(--violet-700)' : 'var(--line-strong)'}
                strokeWidth={warn || isOpen ? 2 : 1.25}
              />
              <text x={316} y={cy - 5} fontSize={14} fontWeight={700} fill="var(--text)">
                {g.label}
              </text>
              <text x={316} y={cy + 16} fontSize={13} fill="var(--text-sub)">
                {formatWon(g.amount)}원 · {formatPct(g.share, 1)}
              </text>
              {toggleable && (
                <text className={`flow-chevron${isOpen ? ' is-open' : ''}`} x={511} y={cy + 5} textAnchor="middle" fontSize={14} fill="var(--text-sub)">
                  ▸
                </text>
              )}
              {!warn && <rect x={316} y={cy + 22} width={Math.max(2, Math.min(1, Math.abs(g.share)) * 198)} height={3} rx={1.5} fill={isOpen ? 'var(--violet-700)' : 'var(--line-strong)'} />}
            </g>
          </g>
        )
      })}

      {/* 2단계: 펼친 그룹의 세부 항목 */}
      {open && (
        <g key={open.key}>
          {details.map((d, i) => (
            <g key={d.name}>
              <path
                className="flow-detail__link"
                d={`M530 ${openY} C570 ${openY} 580 ${detailY(i)} 620 ${detailY(i)}`}
                fill="none"
                stroke="var(--violet-300)"
                strokeWidth={linkWidth(d.share) * 0.6}
                pathLength={1}
                strokeDasharray="1 1"
              />
              <g className="flow-detail__box">
                <rect x={620} y={detailY(i) - 20} width={300} height={40} rx={12} fill="#FFFFFF" stroke="var(--line)" />
                <text x={634} y={detailY(i) + 5} fontSize={13} fill="var(--text)">
                  {d.name}
                </text>
                <text x={906} y={detailY(i) + 5} textAnchor="end" fontSize={13} fontWeight={600} fill="var(--text)">
                  {formatWon(d.amount)} · {formatPct(d.share, 1)}
                </text>
              </g>
            </g>
          ))}
          <text x={944} y={mid - 8} fontSize={12} fill="var(--text-sub)">
            {open.label} {details.length}개 항목
          </text>
          <text x={944} y={mid + 10} fontSize={12} fill="var(--text-sub)">
            총 수입 대비 비중
          </text>
        </g>
      )}
    </svg>
  )
}

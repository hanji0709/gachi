import { useRef, useState, type KeyboardEvent } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from '../../animation/gsap'
import './pnl.css'

/** PC "수입 흐름표" 흐름 마인드맵 (SVG) */

interface FlowNode {
  label: string
  sub: string
  /** 노드 세로 중심 */
  cy: number
  /** 총 수입에서 이어지는 선 두께(비중) */
  linkWidth: number
  stroke: string
  strokeWidth: number
  chevron: string
  /** 노드 아래 비중 막대 너비 (없으면 표시 안 함) */
  barWidth?: number
  barColor?: string
}

const NODES: FlowNode[] = [
  {
    label: '고정지출',
    sub: '19,740,741원 · 62.5%',
    cy: 88,
    linkWidth: 17.5,
    stroke: 'var(--violet-700)',
    strokeWidth: 2,
    chevron: '▾',
    barWidth: 123.7,
    barColor: 'var(--violet-700)',
  },
  {
    label: '변동지출',
    sub: '556,788원 · 1.8%',
    cy: 198,
    linkWidth: 1.5,
    stroke: 'var(--line-strong)',
    strokeWidth: 1.25,
    chevron: '▸',
    barWidth: 3.5,
    barColor: 'var(--line-strong)',
  },
  {
    label: '저축/투자/상환',
    sub: '10,370,367원 · 32.8%',
    cy: 308,
    linkWidth: 9.2,
    stroke: 'var(--line-strong)',
    strokeWidth: 1.25,
    chevron: '▸',
    barWidth: 65.0,
    barColor: 'var(--line-strong)',
  },
  {
    label: '불일치하는 차액',
    sub: '924,694원 · 2.9%',
    cy: 418,
    linkWidth: 1.5,
    stroke: 'var(--warn-fill)',
    strokeWidth: 2,
    chevron: '▸',
  },
]

/** 펼쳐진 고정지출의 세부 항목 */
const DETAILS = [
  { label: '대출 원금', value: '7,037,034 · 22.3%', cy: 58, linkWidth: 5.0 },
  { label: '대출 이자', value: '3,703,701 · 11.7%', cy: 116, linkWidth: 2.6 },
  { label: '개인용돈', value: '3,703,701 · 11.7%', cy: 174, linkWidth: 2.6 },
  { label: '차량임차료', value: '3,370,368 · 10.7%', cy: 232, linkWidth: 2.4 },
  { label: '아파트관리비', value: '1,037,034 · 3.3%', cy: 290, linkWidth: 1.2 },
  { label: '보험료', value: '703,701 · 2.2%', cy: 348, linkWidth: 1.2 },
  { label: '통신비', value: '370,368 · 1.2%', cy: 406, linkWidth: 1.2 },
]

export function PcFlowMap() {
  const svgRef = useRef<SVGSVGElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const [fixedOpen, setFixedOpen] = useState(true)

  /**
   * 세부 항목 펼침 타임라인 (처음엔 펼친 상태 = 끝 지점)
   * 펼칠 때(정방향): 고정지출에서 오른쪽으로 연결선이 그려지고 → 상자가 오른쪽으로 미끄러져 나옴 (위에서부터)
   * 접을 때(역방향): 상자가 고정지출 쪽으로 미끄러져 사라지고 → 연결선이 되감김 (아래에서부터)
   */
  useGSAP(
    () => {
      const links = gsap.utils.toArray<SVGPathElement>('.flow-detail__link')
      const boxes = gsap.utils.toArray<SVGGElement>('.flow-detail__box')
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } })
      tl.fromTo(links, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.4, stagger: 0.05 }, 0)
        .fromTo(boxes, { autoAlpha: 0, x: -36 }, { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.05 }, 0.18)
        .fromTo('.flow-hint', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, '-=0.2')
      tl.progress(1)
      tlRef.current = tl
    },
    { scope: svgRef },
  )

  const toggle = () => {
    const next = !fixedOpen
    setFixedOpen(next)
    const tl = tlRef.current
    if (!tl) return
    if (prefersReducedMotion()) tl.progress(next ? 1 : 0).pause()
    else if (next) tl.timeScale(1).play()
    else tl.timeScale(1.3).reverse() // 접기는 조금 더 빠르게
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggle()
    }
  }

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1180 470"
      width="100%"
      role="group"
      aria-label="수입에서 지출 저축으로 이어지는 흐름 마인드맵"
      style={{ display: 'block' }}
    >
      {/* 총 수입 */}
      <rect x={24} y={195} width={200} height={80} rx={16} fill="var(--violet-100)" stroke="var(--violet-700)" strokeWidth={2} />
      <text x={42} y={225} fontSize={15} fontWeight={700} fill="var(--text)">
        총 수입
      </text>
      <text x={42} y={251} fontSize={17} fontWeight={700} fill="var(--text)">
        31,592,590원
      </text>
      <text x={210} y={225} textAnchor="end" fontSize={12} fill="var(--violet-700)" fontWeight={600}>
        100%
      </text>
      <text x={42} y={297} fontSize={12} fill="var(--text-sub)">
        근로 29,629,629 · 배당/이자 1,962,961
      </text>

      {/* 1단계: 지출·저축 */}
      {NODES.map((n) => {
        // 세부 항목이 있는 고정지출만 펼치기/접기 버튼 (디자인에 다른 노드의 세부 데이터는 없음)
        const toggleable = n.label === '고정지출'
        const open = toggleable ? fixedOpen : n.chevron === '▾'
        return (
          <g key={n.label}>
            <path
              d={`M224 235.0 C264 235.0 260 ${n.cy} 300 ${n.cy}`}
              fill="none"
              stroke="var(--line-strong)"
              strokeWidth={n.linkWidth}
              strokeOpacity={0.7}
            />
            <g
              {...(toggleable
                ? {
                    className: 'flow-toggle',
                    role: 'button',
                    tabIndex: 0,
                    'aria-expanded': fixedOpen,
                    'aria-label': `고정지출 세부 항목 ${fixedOpen ? '접기' : '펼치기'}`,
                    onClick: toggle,
                    onKeyDown,
                  }
                : {})}
            >
              {toggleable && (
                <rect
                  className="flow-toggle__ring"
                  x={296}
                  y={n.cy - 32}
                  width={238}
                  height={64}
                  rx={17}
                  fill="none"
                  stroke="var(--violet-700)"
                  strokeWidth={2}
                />
              )}
              <rect
                className="flow-toggle__box"
                x={300}
                y={n.cy - 28}
                width={230}
                height={56}
                rx={14}
                fill="#FFFFFF"
                stroke={n.stroke}
                strokeWidth={n.strokeWidth}
              />
              <text x={316} y={n.cy - 5} fontSize={14} fontWeight={700} fill="var(--text)">
                {n.label}
              </text>
              <text x={316} y={n.cy + 16} fontSize={13} fill="var(--text-sub)">
                {n.sub}
              </text>
              {/* ▸ 를 90° 돌려 ▾ 로 */}
              <text
                className={`flow-chevron${open ? ' is-open' : ''}`}
                x={511}
                y={n.cy + 5}
                textAnchor="middle"
                fontSize={14}
                fill="var(--text-sub)"
              >
                ▸
              </text>
              {n.barWidth !== undefined && (
                <rect x={316} y={n.cy + 22} width={n.barWidth} height={3} rx={1.5} fill={n.barColor} />
              )}
            </g>
          </g>
        )
      })}

      {/* 2단계: 고정지출 세부 항목 (접히면 숨김) */}
      <g aria-hidden={!fixedOpen}>
        {DETAILS.map((d) => (
          <g key={d.label}>
            <path
              className="flow-detail__link"
              d={`M530 88 C570 88 580 ${d.cy} 620 ${d.cy}`}
              fill="none"
              stroke="var(--violet-300)"
              strokeWidth={d.linkWidth}
              // 길이를 1로 두고 dashoffset 1→0 으로 선을 그려 나감
              pathLength={1}
              strokeDasharray="1 1"
            />
            <g className="flow-detail__box">
              <rect x={620} y={d.cy - 22} width={250} height={44} rx={12} fill="#FFFFFF" stroke="var(--line)" />
              <text x={634} y={d.cy + 5} fontSize={13} fill="var(--text)">
                {d.label}
              </text>
              <text x={856} y={d.cy + 5} textAnchor="end" fontSize={13} fontWeight={600} fill="var(--text)">
                {d.value}
              </text>
            </g>
          </g>
        ))}

        <g className="flow-hint">
          <text x={894} y={60} fontSize={12} fill="var(--text-sub)">
            세부 항목을 누르면
          </text>
          <text x={894} y={78} fontSize={12} fill="var(--text-sub)">
            월별 추이가 열립니다
          </text>
        </g>
      </g>
    </svg>
  )
}

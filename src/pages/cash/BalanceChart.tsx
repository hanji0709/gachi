import { ChartHover, TipRow, TipTitle, linearScale, parseAxisLabel } from '../../components/ui'
import { formatShort } from '../../data/format'

/** 예상 잔액 추이 계단형 그래프 (PC·모바일 공용, 좌표는 화면별 데이터로 전달) */
export interface BalanceChartGeometry {
  width: number
  height: number
  /** 그래프 왼쪽/오른쪽 x */
  left: number
  right: number
  /** 0만 기준선 y */
  baseY: number
  /** 눈금선 y (아래→위) */
  gridY: number[]
  /** 안전 잔액(300만) y */
  safeY: number
  /** 위험 구간(오늘~다음 점) 강조 사각형 */
  danger: { x: number; width: number }
  /** 계단 경로 꼭짓점 (첫 점부터 마지막 점까지) */
  points: [number, number][]
  /** 입출금 발생 지점 (dangerIndex 점만 빨강) */
  dots: [number, number][]
  dangerIndex: number
  todayX: number
  /** x축 날짜 레이블 */
  xLabels: { x: number; label: string }[]
  xLabelY: number
}

const Y_LABELS = ['0만', '300만', '600만', '900만', '1,200만']
const SAFE_BALANCE = 3_000_000

/**
 * 예상 잔액 계단 그래프
 * 입출금이 있는 날(점)에 마우스오버·터치하면 그날 잔액·변동·안전 잔액 대비를 레이어 팝업으로.
 * (값은 축 눈금으로 좌표를 되돌린 만원 단위)
 */
export function BalanceChart({ g }: { g: BalanceChartGeometry }) {
  const line = g.points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${g.right.toFixed(1)},${g.baseY.toFixed(1)} L${g.left.toFixed(1)},${g.baseY.toFixed(1)} Z`
  const top = g.gridY[g.gridY.length - 1]
  const valueOf = linearScale(g.baseY, 0, top, parseAxisLabel(Y_LABELS[Y_LABELS.length - 1]))
  // x → 날짜 (1일 = 왼쪽, 30일 = 오른쪽)
  const dayOf = (x: number) => Math.round(1 + ((x - g.left) / (g.right - g.left)) * 29)
  const startBalance = valueOf(g.points[0][1])
  return (
    <ChartHover
      width={g.width}
      height={g.height}
      plotTop={top}
      plotBottom={g.baseY}
      label="예상 잔액 추이 계단형 그래프"
      points={g.dots.map(([x, y]) => ({ x, y }))}
      renderMarker={(i) => (
        <circle
          cx={g.dots[i][0]}
          cy={g.dots[i][1]}
          r={7}
          fill={i === g.dangerIndex ? 'var(--bad)' : 'var(--violet-700)'}
          stroke="#FFFFFF"
          strokeWidth={2.5}
        />
      )}
      renderTooltip={(i) => {
        const [x, y] = g.dots[i]
        const balance = valueOf(y)
        const before = i === 0 ? startBalance : valueOf(g.dots[i - 1][1])
        const change = balance - before
        const short = SAFE_BALANCE - balance
        return (
          <>
            <TipTitle>
              {dayOf(x)}일{i === g.dangerIndex ? ' · 오늘' : ''}
            </TipTitle>
            <TipRow color="var(--violet-700)" line label="예상 잔액" value={`${formatShort(balance)}원`} />
            <TipRow
              label={i === 0 ? '시작 잔액 대비' : '직전 대비'}
              value={
                <span style={{ color: change > 0 ? 'var(--good)' : change < 0 ? 'var(--bad)' : undefined }}>
                  {change > 0 ? '▲ +' : change < 0 ? '▼ ' : ''}
                  {formatShort(change)}원
                </span>
              }
            />
            {short > 0 && (
              <TipRow label="안전 잔액보다" value={<span style={{ color: 'var(--bad)' }}>{formatShort(short)}원 부족</span>} strong />
            )}
          </>
        )
      }}
    >
      {g.gridY.map((y, i) => (
        <g key={y}>
          <line x1={g.left} x2={g.right} y1={y} y2={y} stroke="var(--line)" />
          <text x={g.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--text-sub)">
            {Y_LABELS[i]}
          </text>
        </g>
      ))}
      <rect x={g.danger.x} y={g.safeY} width={g.danger.width} height={g.baseY - g.safeY} fill="var(--bad)" fillOpacity="0.08" />
      <path d={area} fill="var(--violet-700)" fillOpacity="0.08" />
      <path d={line} fill="none" stroke="var(--violet-700)" strokeWidth="2.5" strokeLinejoin="round" />
      <line x1={g.left} x2={g.right} y1={g.safeY} y2={g.safeY} stroke="var(--bad)" strokeWidth="1.5" strokeDasharray="5 4" />
      <text x={g.right - 4} y={g.safeY - 6} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--bad)">
        안전 잔액 300만
      </text>
      <line x1={g.todayX} x2={g.todayX} y1={top} y2={g.baseY} stroke="var(--text-sub)" strokeWidth="1" strokeDasharray="2 3" />
      <rect x={g.todayX - 20} y="2" width="40" height="18" rx="9" fill="var(--text)" />
      <text x={g.todayX} y="15" textAnchor="middle" fontSize="11" fontWeight="600" fill="#FFFFFF">
        오늘
      </text>
      {g.dots.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="4.5"
          fill={i === g.dangerIndex ? 'var(--bad)' : 'var(--violet-700)'}
          stroke="#FFFFFF"
          strokeWidth="2"
        />
      ))}
      {g.xLabels.map((l) => (
        <text key={l.label} x={l.x} y={g.xLabelY} textAnchor="middle" fontSize="11" fill="var(--text-sub)">
          {l.label}
        </text>
      ))}
    </ChartHover>
  )
}

/** 디자인 좌표: 1440 PC (viewBox 1100×280) */
export const PC_CHART: BalanceChartGeometry = {
  width: 1100,
  height: 280,
  left: 64,
  right: 1080,
  baseY: 244,
  gridY: [244, 187, 130, 73, 16],
  safeY: 187,
  danger: { x: 729.7, width: 35 },
  points: [
    [64, 56.3], [64, 56.3], [64, 145.5], [204.1, 145.5], [204.1, 146.3], [344.3, 146.3], [344.3, 152.9],
    [379.3, 152.9], [379.3, 167.5], [729.7, 167.5], [729.7, 199.6], [764.7, 199.6], [764.7, 112.8],
    [799.7, 112.8], [799.7, 118.9], [904.8, 118.9], [904.8, 36.8], [939.9, 36.8], [939.9, 81.4],
    [1080, 81.4], [1080, 68.9], [1080, 68.9],
  ],
  dots: [
    [64, 145.5], [204.1, 146.3], [344.3, 152.9], [379.3, 167.5], [729.7, 199.6],
    [764.7, 112.8], [799.7, 118.9], [904.8, 36.8], [939.9, 81.4], [1080, 68.9],
  ],
  dangerIndex: 4,
  todayX: 729.7,
  xLabels: [
    { x: 64, label: '1일' }, { x: 204.1, label: '5일' }, { x: 379.3, label: '10일' }, { x: 554.5, label: '15일' },
    { x: 729.7, label: '20일' }, { x: 904.8, label: '25일' }, { x: 1080, label: '30일' },
  ],
  xLabelY: 266,
}

/** 디자인 좌표: 모바일 (viewBox 360×220) */
export const M_CHART: BalanceChartGeometry = {
  width: 360,
  height: 220,
  left: 44,
  right: 340,
  baseY: 184,
  gridY: [184, 142, 100, 58, 16],
  safeY: 142,
  danger: { x: 237.9, width: 10.2 },
  points: [
    [44, 45.7], [44, 45.7], [44, 111.4], [84.8, 111.4], [84.8, 112], [125.7, 112], [125.7, 116.9],
    [135.9, 116.9], [135.9, 127.6], [237.9, 127.6], [237.9, 151.3], [248.1, 151.3], [248.1, 87.3], [258.3, 87.3],
    [258.3, 91.8], [289, 91.8], [289, 31.3], [299.2, 31.3], [299.2, 64.2], [340, 64.2], [340, 55], [340, 55],
  ],
  dots: [
    [44, 111.4], [84.8, 112], [125.7, 116.9], [135.9, 127.6], [237.9, 151.3],
    [248.1, 87.3], [258.3, 91.8], [289, 31.3], [299.2, 64.2], [340, 55],
  ],
  dangerIndex: 4,
  todayX: 237.9,
  xLabels: [
    { x: 44, label: '1일' }, { x: 84.8, label: '5일' }, { x: 135.9, label: '10일' }, { x: 186.9, label: '15일' },
    { x: 237.9, label: '20일' }, { x: 289, label: '25일' }, { x: 340, label: '30일' },
  ],
  xLabelY: 206,
}

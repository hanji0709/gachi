import { Link } from 'react-router-dom'
import { Card, CardHeader, ChartHover, Delta, Icon, ProgressBar, Segmented } from '../../components/ui'
import { FIRE_TABS, MILESTONES, MilestoneDot, milestoneTextStyle, NetWorthTip, NW_MONTH_LABELS, type FireTab } from './FireShared'

const M_GOALS = [
  { k: '전체 지출', v: '월 877만' },
  { k: '기본 생활비', v: '월 235만' },
  { k: '안전 인출률', v: '4%' },
  { k: '희망 도달', v: '2040년' },
]

interface MIndicator {
  label: string
  value: string
  pct: number
  current: string
  target: string
  shortfall?: string
}

const M_INDICATORS: MIndicator[] = [
  {
    label: '지표 B · 현금흐름 목표',
    value: '7.5%',
    pct: 7.464788957349734,
    current: '현재 월 65만',
    target: '목표 월 877만',
  },
  {
    label: '지표 C · 세미 FIRE',
    value: '87.3%',
    pct: 87.2782088017263,
    current: '현재 월 765만',
    target: '목표 월 877만',
    shortfall: '부족분 월 112만원',
  },
]

/** 모바일 경제적 자유 (달성 현황 / 미래 예측 탭) */
export function MFire({ tab = 'status' }: { tab?: FireTab }) {
  return (
    <>
      <div role="tablist" className="pill-tabs">
        {FIRE_TABS.map((t) => (
          <Link
            key={t.key}
            to={t.to}
            role="tab"
            aria-selected={t.key === tab}
            className="pill-tabs__tab fire-mtab"
          >
            {t.label}
          </Link>
        ))}
      </div>
      {tab === 'status' ? <MStatus /> : <MForecast />}
    </>
  )
}

function MGoalCard() {
  return (
    <Card pad="sm">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b style={{ fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Icon name="navFire" size={18} strokeWidth={2} color="var(--violet-700)" />
          우리 집 목표
        </b>
        <button
          type="button"
          style={{
            fontSize: 13,
            color: 'var(--violet-700)',
            fontWeight: 600,
            background: 'transparent',
            border: 'none',
            padding: 0,
          }}
        >
          편집
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginTop: 12 }}>
        {M_GOALS.map((g) => (
          <div key={g.k}>
            <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>{g.k}</div>
            <b style={{ fontSize: 14 }}>{g.v}</b>
          </div>
        ))}
      </div>
    </Card>
  )
}

function MStatus() {
  return (
    <>
      <MGoalCard />

      <Segmented label="생활비 기준" block options={['기본 생활비', '전체 지출']} defaultValue="전체 지출" />

      <Card hero style={{ padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>경제적 자유까지</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '4px 0 10px' }}>
          <span style={{ fontSize: 40, fontWeight: 700, color: '#fff' }}>30.5%</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>지표 A · 자산 목표</span>
        </div>
        <ProgressBar pct={30.5} height={10} color="var(--cyan-500)" track="rgba(255,255,255,0.25)" />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'rgba(255,255,255,0.9)',
            marginTop: 8,
          }}
        >
          <span>현재 8.0억</span>
          <span>목표 26.3억</span>
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            fontWeight: 600,
            color: '#fff',
            background: 'rgba(255,255,255,0.16)',
            padding: '8px 12px',
            borderRadius: 12,
          }}
        >
          기본 시나리오 2044년 도달 예상
        </div>
      </Card>

      {M_INDICATORS.map((ind) => (
        <Card key={ind.label} pad="sm">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label">{ind.label}</span>
            <Icon name="info" size={16} color="var(--text-sub)" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, margin: '4px 0 8px' }}>{ind.value}</div>
          <ProgressBar pct={ind.pct} height={8} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--text-sub)',
              marginTop: 8,
            }}
          >
            <span>{ind.current}</span>
            <span>{ind.target}</span>
          </div>
          {ind.shortfall && (
            <div style={{ fontSize: 12, color: 'var(--warn)', fontWeight: 600, marginTop: 6 }}>{ind.shortfall}</div>
          )}
        </Card>
      ))}

      <Card pad="md">
        <CardHeader variant="m" title="마일스톤" />
        {MILESTONES.map((m) => (
          <div key={m.pct} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <MilestoneDot done={m.done} size={24} checkSize={12} checkStroke={3} />
            <b style={{ width: 44 }}>{m.pct}</b>
            <span style={milestoneTextStyle(m.done)}>{m.text}</span>
          </div>
        ))}
      </Card>

      <Card pad="md">
        <CardHeader
          variant="m"
          title="월별 순자산 추이"
          right={<Segmented label="기간" size="sm" options={['1년', '3년', '전체']} defaultValue="1년" />}
        />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
          <b style={{ fontSize: 20 }}>12.46억</b>
          <Delta tone="good" size={12} suffix=" 전월 대비">
            ▲ +12,345,678원
          </Delta>
        </div>
        <MNetWorthChart />
        <div className="fire-legend" style={{ gap: '6px 12px' }}>
          {M_NW_LEGEND.map((l) => (
            <span key={l.label} className="fire-legend__item">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
              {l.label}
            </span>
          ))}
          <span className="fire-legend__item">
            <span style={{ width: 12, height: 2.5, background: 'var(--text)' }} />
            순자산
          </span>
        </div>
      </Card>
    </>
  )
}

/* ───────── 월별 순자산 추이 차트 (모바일) ─────────
 * 자산(부동산·금융투자·예적금·연금·기타)은 0억 위로 쌓고, 부채는 0억 아래로. 순자산은 선.
 * 좌표는 디자인 시안 그대로 (viewBox 360×240) */
const M_NW_LEGEND = [
  { label: '부동산', color: 'var(--chart-1)' },
  { label: '금융투자', color: 'var(--chart-2)' },
  { label: '예적금', color: 'var(--chart-3)' },
  { label: '연금·기타', color: 'var(--chart-4)' },
  { label: '부채', color: 'var(--line-strong)' },
]

const M_Y_GRID = [
  { y: 209.4, label: '-10억' },
  { y: 148.4, label: '0억', zero: true },
  { y: 87.4, label: '10억' },
  { y: 26.4, label: '20억' },
  { y: -34.7, label: '30억' }, // 시안대로: 차트 영역 밖이라 보이지 않음
]

/** 막대 x · [금융투자 y,h] · [예적금 y,h] · [연금·기타 y,h] · 부채 h · 순자산 선 y · x축 라벨 */
interface MNwBar {
  x: number
  fin: [number, number]
  dep: [number, number]
  pen: [number, number]
  debt: number
  line: number
  label?: string
}

const M_NW_BARS: MNwBar[] = [
  { x: 41.1, fin: [32.0, 41.0], dep: [30.8, 1.2], pen: [30.1, 0.7], debt: 51.8, line: 81.9 },
  { x: 66.8, fin: [31.3, 41.8], dep: [30.0, 1.3], pen: [29.3, 0.7], debt: 51.7, line: 80.9 },
  { x: 92.5, fin: [30.6, 42.5], dep: [29.2, 1.4], pen: [28.4, 0.7], debt: 51.6, line: 80.0, label: '1월' },
  { x: 118.1, fin: [29.9, 43.2], dep: [28.4, 1.5], pen: [27.6, 0.7], debt: 51.4, line: 79.0 },
  { x: 143.8, fin: [29.1, 43.9], dep: [27.9, 1.3], pen: [27.1, 0.7], debt: 51.3, line: 78.4 },
  { x: 169.5, fin: [28.4, 44.6], dep: [27.1, 1.4], pen: [26.3, 0.7], debt: 51.2, line: 77.5, label: '4월' },
  { x: 195.1, fin: [27.7, 45.4], dep: [26.3, 1.5], pen: [25.5, 0.7], debt: 51.0, line: 76.6 },
  { x: 220.8, fin: [27.0, 46.1], dep: [25.8, 1.2], pen: [25.0, 0.7], debt: 50.9, line: 75.9 },
  { x: 246.5, fin: [26.3, 46.8], dep: [25.0, 1.3], pen: [24.2, 0.7], debt: 50.8, line: 75.0, label: '7월' },
  { x: 272.1, fin: [25.5, 47.5], dep: [24.1, 1.4], pen: [23.4, 0.7], debt: 50.7, line: 74.1 },
  { x: 297.8, fin: [24.8, 48.2], dep: [23.3, 1.5], pen: [22.6, 0.7], debt: 50.5, line: 73.1 },
  { x: 323.5, fin: [24.1, 49.0], dep: [22.9, 1.3], pen: [22.1, 0.7], debt: 50.4, line: 72.5, label: '10월' },
]

const M_BAR_W = 15.4
const M_HALF = 7.7
const M_ZERO_Y = 148.4
/** 부동산 막대: 모든 달 같은 값 */
const M_ESTATE = { y: 73.1, h: 75.3 }

const M_TEN_Y = 87.4 // 10억선

function MNetWorthChart() {
  const points = M_NW_BARS.map((b) => `${(b.x + M_HALF).toFixed(1)},${b.line}`).join(' ')
  return (
    <ChartHover
      width={360}
      height={240}
      plotTop={12}
      plotBottom={M_ZERO_Y + 56}
      label="월별 순자산 추이"
      points={M_NW_BARS.map((b) => ({ x: b.x + M_HALF, y: b.pen[0] }))}
      renderMarker={(i) => {
        const b = M_NW_BARS[i]
        return (
          <>
            <rect x={b.x - 1.5} y={b.pen[0] - 1.5} width={M_BAR_W + 3} height={M_ZERO_Y + b.debt - b.pen[0] + 3} rx={3} fill="none" stroke="var(--violet-900)" strokeWidth={1.5} />
            <circle cx={b.x + M_HALF} cy={b.line} r={5} stroke="#FFFFFF" strokeWidth={2} style={{ fill: 'var(--text)' }} />
          </>
        )
      }}
      renderTooltip={(i) => {
        const b = M_NW_BARS[i]
        return (
          <NetWorthTip
            month={NW_MONTH_LABELS[i]}
            zeroY={M_ZERO_Y}
            tenY={M_TEN_Y}
            h={{ estate: M_ESTATE.h, fin: b.fin[1], dep: b.dep[1], pen: b.pen[1], debt: b.debt, net: M_ZERO_Y - b.line }}
          />
        )
      }}
    >
      {M_Y_GRID.map((g) => (
        <g key={g.label}>
          <line x1={36} x2={344} y1={g.y} y2={g.y} style={{ stroke: g.zero ? 'var(--line-strong)' : 'var(--line)' }} />
          <text x={30} y={g.y + 4} textAnchor="end" fontSize={11} style={{ fill: 'var(--text-sub)' }}>
            {g.label}
          </text>
        </g>
      ))}
      {M_NW_BARS.map((b) => (
        <g key={b.x}>
          <rect x={b.x} y={M_ESTATE.y} width={M_BAR_W} height={M_ESTATE.h} style={{ fill: 'var(--chart-1)' }} />
          <rect x={b.x} y={b.fin[0]} width={M_BAR_W} height={b.fin[1]} style={{ fill: 'var(--chart-2)' }} />
          <rect x={b.x} y={b.dep[0]} width={M_BAR_W} height={b.dep[1]} style={{ fill: 'var(--chart-3)' }} />
          <rect x={b.x} y={b.pen[0]} width={M_BAR_W} height={b.pen[1]} style={{ fill: 'var(--chart-4)' }} />
          <rect x={b.x} y={M_ZERO_Y} width={M_BAR_W} height={b.debt} style={{ fill: 'var(--line-strong)' }} />
          {b.label && (
            <text x={b.x + M_HALF} y={230} textAnchor="middle" fontSize={11} style={{ fill: 'var(--text-sub)' }}>
              {b.label}
            </text>
          )}
        </g>
      ))}
      <polyline points={points} fill="none" strokeWidth={2.5} style={{ stroke: 'var(--text)' }} />
      {M_NW_BARS.map((b) => (
        <circle key={b.x} cx={b.x + M_HALF} cy={b.line} r={3.5} style={{ fill: 'var(--text)' }} />
      ))}
    </ChartHover>
  )
}

/* ───────── 미래 예측 탭 (모바일 시안 없음 · PC 미래 예측 내용을 모바일 카드로 축약) ───────── */
const M_KPIS = [
  { label: '경제적 자유 도달 예상', value: '2044년', color: 'var(--violet-700)', sub: '지금부터 18년 · 낙관 2039년' },
  { label: '20년 후 순자산 · 기본', value: '68.9억', sub: '보수 46억 ~ 낙관 110억 · 명목' },
  { label: '목표 자산 (전체 지출 기준)', value: '26.3억', sub: '오늘 가치 · 물가 2.5% 반영해 매년 커짐' },
]

const M_SCENARIOS = [
  { name: '기본', rate: '3% / 7%', y20: '68.9억', reach: '2044년', ok: true },
  { name: '보수', rate: '2% / 4%', y20: '46.4억', reach: '20년 안 어려움', ok: false },
  { name: '낙관', rate: '5% / 10%', y20: '109.6억', reach: '2039년', ok: true },
]

function MForecast() {
  return (
    <>
      <MGoalCard />
      {M_KPIS.map((k) => (
        <Card key={k.label} pad="sm">
          <div className="label">{k.label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, margin: '4px 0 4px', color: k.color }}>{k.value}</div>
          <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>{k.sub}</div>
        </Card>
      ))}
      <Card pad="md">
        <CardHeader variant="m" title="시나리오 비교" />
        {M_SCENARIOS.map((s) => (
          <div
            key={s.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 0',
              borderTop: '1px solid var(--line)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>부동산 / 금융투자 {s.rate}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{s.y20}</div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginTop: 2,
                  color: s.ok ? 'var(--violet-700)' : 'var(--text-sub)',
                }}
              >
                {s.reach}
              </div>
            </div>
          </div>
        ))}
        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-sub)' }}>
          예측은 입력한 가정에 따른 계산이며 투자 조언이 아닙니다.
        </p>
      </Card>
    </>
  )
}

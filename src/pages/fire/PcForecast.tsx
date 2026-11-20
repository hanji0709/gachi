import { Fragment, type ReactNode } from 'react'
import {
  Card,
  CardHeader,
  ChartHover,
  DataTable,
  Segmented,
  SubBox,
  TipRow,
  TipTitle,
  linearScale,
  parseAxisLabel,
  parsePoints,
  type Column,
  type Row,
} from '../../components/ui'
import { formatShort } from '../../data/format'
import { FireHead, GoalCard } from './FireShared'

/* ───────── 요약 카드 ───────── */
interface Kpi {
  label: string
  value: string
  unit?: string
  color?: string
  sub: string
}

const KPIS: Kpi[] = [
  { label: '20년 후 순자산 · 기본', value: '68.9억', unit: ' 원', sub: '보수 46억 ~ 낙관 110억 · 명목' },
  {
    label: '경제적 자유 도달 예상',
    value: '2044년',
    color: 'var(--violet-700)',
    sub: '지금부터 18년 · 낙관 2039년 · 보수 20년 안 도달 어려움',
  },
  { label: '목표 자산 (전체 지출 기준)', value: '26.3억', unit: ' 원', sub: '오늘 가치 · 물가 2.5% 반영해 매년 커짐' },
]

/* ───────── 시나리오 비교 표 ───────── */
const SCENARIO_COLUMNS: Column[] = [
  { key: 'name', label: '시나리오', strong: true },
  { key: 'rate', label: '부동산 / 금융투자', align: 'right' },
  { key: 'y10', label: '10년 후 순자산', align: 'right' },
  { key: 'y20', label: '20년 후 순자산', align: 'right', strong: true },
  { key: 'reach', label: '도달 연도', align: 'right', strong: true },
]

const reach = (text: string, ok: boolean): ReactNode => (
  <span style={{ color: ok ? 'var(--violet-700)' : 'var(--text-sub)' }}>{text}</span>
)

const SCENARIO_ROWS: Row[] = [
  { name: '기본', rate: '3% / 7%', y10: '33.3억', y20: '68.9억', reach: reach('2044년', true) },
  { name: '보수', rate: '2% / 4%', y10: '27.0억', y20: '46.4억', reach: reach('20년 안 어려움', false) },
  { name: '낙관', rate: '5% / 10%', y10: '42.9억', y20: '109.6억', reach: reach('2039년', true) },
]

/* ───────── 가정 입력 ───────── */
const GROWTH = [
  { id: 'fire-g-re', label: '부동산', value: '3' },
  { id: 'fire-g-fin', label: '금융투자', value: '7' },
  { id: 'fire-g-dep', label: '예적금', value: '2' },
  { id: 'fire-g-pen', label: '연금', value: '5' },
  { id: 'fire-g-etc', label: '기타', value: '0' },
  { id: 'fire-g-inf', label: '인플레이션', value: '2.5' },
]

const MONTHLY = [
  { id: 'fire-m-invest', label: '추가 투자액', value: '3,456,789' },
  { id: 'fire-m-debt', label: '부채 원금 상환', value: '2,345,678' },
]

const REF_RETURNS = [
  { k: '멀캠 APT', v: '9~10%' },
  { k: '서울 APT', v: '8~11%' },
  { k: '경기도 APT', v: '7~8%' },
  { k: '나스닥100', v: '19~20%' },
]

function AssumeRow({ id, label, value, unit }: { id: string; label: string; value: string; unit: string }) {
  return (
    <div className="fire-assume__row">
      <label htmlFor={id}>{label}</label>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <input id={id} type="text" inputMode="decimal" defaultValue={value} className="fire-assume__input" />
        <span className="fire-assume__unit">{unit}</span>
      </span>
    </div>
  )
}

export function PcForecast() {
  return (
    <>
      <FireHead active="forecast" />
      <GoalCard />

      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}>
        {KPIS.map((k) => (
          <Card key={k.label}>
            <div className="label">{k.label}</div>
            <div style={{ margin: '6px 0 4px', fontSize: 30, fontWeight: 700, color: k.color }}>
              {k.value}
              {k.unit && <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text-sub)' }}>{k.unit}</span>}
            </div>
            <div className="caption">{k.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', marginTop: 20 }}>
        <div style={{ flex: '999 1 640px', minWidth: 0 }}>
          <Card>
            <CardHeader
              title="미래 자산"
              right={
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Segmented label="보기" size="sm" options={['투자 가능 자산', '순자산']} defaultValue="투자 가능 자산" />
                  <Segmented label="금액 기준" size="sm" options={['명목', '실질']} defaultValue="명목" />
                </div>
              }
            />
            <ForecastChart />
            <div className="fire-legend">
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 14,
                    height: 2.5,
                    background: 'var(--violet-700)',
                    marginRight: 6,
                    verticalAlign: 'middle',
                  }}
                />
                투자 가능 자산 · 기본
              </span>
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 10,
                    background: 'var(--violet-700)',
                    opacity: 0.15,
                    marginRight: 6,
                  }}
                />
                보수 ~ 낙관 범위
              </span>
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 14,
                    height: 0,
                    borderTop: '2px dashed var(--warn-fill)',
                    marginRight: 6,
                    verticalAlign: 'middle',
                  }}
                />
                목표 자산(물가 반영)
              </span>
            </div>
          </Card>

          <Card style={{ marginTop: 20 }}>
            <CardHeader
              title="시나리오 비교"
              right={
                <button
                  type="button"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    minHeight: 32,
                    padding: '0 6px',
                    borderRadius: 14,
                    background: 'transparent',
                    color: 'var(--violet-700)',
                    border: 'none',
                  }}
                >
                  + 시나리오 저장
                </button>
              }
            />
            <DataTable columns={SCENARIO_COLUMNS} rows={SCENARIO_ROWS} caption="시나리오 비교" />
            <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--text-sub)' }}>
              예측은 입력한 가정에 따른 계산이며 투자 조언이 아닙니다.
            </p>
          </Card>
        </div>

        <div style={{ flex: '1 1 340px', minWidth: 0 }}>
          <Card style={{ padding: 20 }}>
            <CardHeader title="가정" />
            <Segmented label="프리셋" block options={['보수', '기본', '낙관']} defaultValue="기본" />

            <div className="fire-assume__group" style={{ margin: '18px 0 2px' }}>
              연간 성장률
            </div>
            {GROWTH.map((g) => (
              <AssumeRow key={g.id} id={g.id} label={g.label} value={g.value} unit="%" />
            ))}

            <div className="fire-assume__group" style={{ margin: '14px 0 2px' }}>
              매달 넣는 돈 <span style={{ fontWeight: 400, color: 'var(--text-sub)' }}>· 결산 최근 3개월 평균</span>
            </div>
            {MONTHLY.map((g) => (
              <AssumeRow key={g.id} id={g.id} label={g.label} value={g.value} unit="원" />
            ))}

            <label htmlFor="fire-period" className="fire-assume__group" style={{ display: 'block', margin: '14px 0 8px' }}>
              예측 기간 · 20년
            </label>
            <input
              id="fire-period"
              type="range"
              min={5}
              max={40}
              defaultValue={20}
              style={{ width: '100%', accentColor: 'var(--violet-700)' }}
            />

            <SubBox style={{ marginTop: 18, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>최근 10년 연평균 수익률 (참고)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 12px', fontSize: 13 }}>
                {REF_RETURNS.map((r) => (
                  <Fragment key={r.k}>
                    <span>{r.k}</span>
                    <b>{r.v}</b>
                  </Fragment>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 8, lineHeight: 1.5 }}>
                출처 [출처] · 기준일 [YYYY-MM]
                <br />
                과거 수익률은 미래를 보장하지 않습니다
              </div>
            </SubBox>
          </Card>
        </div>
      </div>
    </>
  )
}

/* ───────── 미래 자산 차트 ───────── */
const F_GRID = [
  { y: 288.0, label: '0억' },
  { y: 219.0, label: '21억' },
  { y: 150.0, label: '41억' },
  { y: 81.0, label: '62억' },
  { y: 12.0, label: '83억' },
]

const F_YEARS = [
  { x: 56.0, label: '2026' },
  { x: 192.8, label: '2030' },
  { x: 329.6, label: '2034' },
  { x: 466.4, label: '2038' },
  { x: 603.2, label: '2042' },
  { x: 740.0, label: '2046' },
]

const RANGE_PATH =
  'M56.0,261.2 L90.2,257.1 L124.4,252.6 L158.6,247.6 L192.8,242.1 L227.0,236.1 L261.2,229.4 L295.4,222.1 L329.6,214.1 L363.8,205.3 L398.0,195.5 L432.2,184.8 L466.4,173.1 L500.6,160.2 L534.8,145.9 L569.0,130.3 L603.2,113.0 L637.4,94.1 L671.6,73.3 L705.8,50.4 L740.0,25.1 L740.0,187.4 L705.8,192.6 L671.6,197.7 L637.4,202.5 L603.2,207.1 L569.0,211.6 L534.8,215.9 L500.6,220.0 L466.4,224.0 L432.2,227.8 L398.0,231.5 L363.8,235.0 L329.6,238.4 L295.4,241.7 L261.2,244.8 L227.0,247.8 L192.8,250.7 L158.6,253.5 L124.4,256.2 L90.2,258.8 L56.0,261.2 Z'

const TARGET_POINTS =
  '56.0,200.3 90.2,198.1 124.4,195.9 158.6,193.6 192.8,191.2 227.0,188.8 261.2,186.3 295.4,183.8 329.6,181.1 363.8,178.5 398.0,175.7 432.2,172.9 466.4,170.1 500.6,167.1 534.8,164.1 569.0,161.0 603.2,157.8 637.4,154.6 671.6,151.2 705.8,147.8 740.0,144.3'

const BASE_POINTS =
  '56.0,261.2 90.2,257.9 124.4,254.4 158.6,250.6 192.8,246.6 227.0,242.3 261.2,237.6 295.4,232.7 329.6,227.4 363.8,221.7 398.0,215.6 432.2,209.1 466.4,202.2 500.6,194.8 534.8,186.8 569.0,178.3 603.2,169.2 637.4,159.4 671.6,149.0 705.8,137.9 740.0,125.9'

/* 연도별 값 (2026~2046, 21개): 좌표를 축 눈금(0억=288, 83억=12)으로 되돌림 */
const F_BASE = parsePoints(BASE_POINTS)
const F_TARGET = parsePoints(TARGET_POINTS)
const F_RANGE = parsePoints(RANGE_PATH)
const F_UPPER = F_RANGE.slice(0, 21)
const F_LOWER = F_RANGE.slice(21).reverse()
const F_VALUE = linearScale(F_GRID[0].y, 0, F_GRID[F_GRID.length - 1].y, parseAxisLabel(F_GRID[F_GRID.length - 1].label))
const F_START_YEAR = 2026

function ForecastTip({ i }: { i: number }) {
  const v = (pt: [number, number]) => F_VALUE(pt[1])
  const base = v(F_BASE[i])
  const target = v(F_TARGET[i])
  const gap = target - base
  return (
    <>
      <TipTitle>
        {F_START_YEAR + i}년{i > 0 ? ` · ${i}년 후` : ' · 올해'}
      </TipTitle>
      <TipRow color="var(--violet-300)" label="낙관" value={`${formatShort(v(F_UPPER[i]))}원`} />
      <TipRow color="var(--violet-700)" line label="기본" value={`${formatShort(base)}원`} />
      <TipRow color="var(--violet-300)" label="보수" value={`${formatShort(v(F_LOWER[i]))}원`} />
      <TipRow color="var(--warn-fill)" line label="목표 자산" value={`${formatShort(target)}원`} />
      <TipRow
        label="기본 기준"
        value={
          gap <= 0 ? (
            <span style={{ color: 'var(--good)' }}>목표 달성</span>
          ) : (
            <span style={{ color: 'var(--warn)' }}>{formatShort(gap)}원 부족</span>
          )
        }
        strong
      />
    </>
  )
}

function ForecastChart() {
  return (
    <ChartHover
      width={760}
      height={320}
      plotTop={12}
      plotBottom={288}
      label="투자 가능 자산 예측과 목표 자산선"
      points={F_BASE.map(([x], i) => ({ x, y: Math.min(F_UPPER[i][1], F_TARGET[i][1]) }))}
      renderMarker={(i) => (
        <>
          <circle cx={F_UPPER[i][0]} cy={F_UPPER[i][1]} r={4} stroke="#fff" strokeWidth={1.5} style={{ fill: 'var(--violet-300)' }} />
          <circle cx={F_LOWER[i][0]} cy={F_LOWER[i][1]} r={4} stroke="#fff" strokeWidth={1.5} style={{ fill: 'var(--violet-300)' }} />
          <circle cx={F_TARGET[i][0]} cy={F_TARGET[i][1]} r={5} stroke="#fff" strokeWidth={2} style={{ fill: 'var(--warn-fill)' }} />
          <circle cx={F_BASE[i][0]} cy={F_BASE[i][1]} r={6} stroke="#fff" strokeWidth={2} style={{ fill: 'var(--violet-700)' }} />
        </>
      )}
      renderTooltip={(i) => <ForecastTip i={i} />}
    >
      {F_GRID.map((g) => (
        <g key={g.label}>
          <line x1={56} x2={740} y1={g.y} y2={g.y} style={{ stroke: 'var(--line)' }} />
          <text x={50} y={g.y + 4} textAnchor="end" fontSize={11} style={{ fill: 'var(--text-sub)' }}>
            {g.label}
          </text>
        </g>
      ))}
      <path d={RANGE_PATH} fillOpacity={0.1} style={{ fill: 'var(--violet-700)' }} />
      <polyline
        points={TARGET_POINTS}
        fill="none"
        strokeWidth={2}
        strokeDasharray="6 4"
        style={{ stroke: 'var(--warn-fill)' }}
      />
      <polyline points={BASE_POINTS} fill="none" strokeWidth={2.5} style={{ stroke: 'var(--violet-700)' }} />
      <line x1={671.6} x2={671.6} y1={149.0} y2={288.0} strokeDasharray="3 3" style={{ stroke: 'var(--violet-700)' }} />
      <circle cx={671.6} cy={149.0} r={6} stroke="#fff" strokeWidth={2} style={{ fill: 'var(--violet-700)' }} />
      <rect x={625.6} y={113.0} width={92} height={24} rx={12} style={{ fill: 'var(--violet-700)' }} />
      <text x={671.6} y={129.5} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">
        2044년 도달
      </text>
      {F_YEARS.map((t) => (
        <text key={t.label} x={t.x} y={310} textAnchor="middle" fontSize={11} style={{ fill: 'var(--text-sub)' }}>
          {t.label}
        </text>
      ))}
    </ChartHover>
  )
}

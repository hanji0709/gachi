import { Link } from 'react-router-dom'
import { Button, Card, Icon, cx } from '../../components/ui'
import type { BalanceView } from './useBalanceView'

/** 기준 결산월 선택 (디자인의 "2026-10 마감 ▾" 버튼 모양의 선택 상자) */
export function MonthPicker({ view, variant = 'pc' }: { view: BalanceView; variant?: 'pc' | 'm' }) {
  const m = variant === 'm'
  return (
    <label className={cx('picker-btn', m && 'picker-btn--m')} style={{ position: 'relative', cursor: 'pointer' }}>
      <Icon name="calendar" size={m ? 16 : 18} color="var(--text-sub)" />
      <select
        aria-label="기준 결산월"
        value={view.month ?? ''}
        onChange={(e) => view.setMonth(e.target.value)}
        style={{
          appearance: 'none',
          border: 'none',
          background: 'transparent',
          font: 'inherit',
          fontWeight: 600,
          color: 'var(--text)',
          paddingRight: 2,
          cursor: 'pointer',
        }}
      >
        {[...view.months].reverse().map((o) => (
          <option key={o.month} value={o.month}>
            {o.month} {o.closed ? '마감' : '입력 중'}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={m ? 14 : 16} color="var(--text-sub)" />
    </label>
  )
}

/** 결산이 하나도 없을 때 */
export function BalanceEmpty({ compact }: { compact?: boolean }) {
  return (
    <Card pad={compact ? 'md' : 'lg'} style={{ textAlign: 'center', padding: compact ? 24 : 48 }}>
      <h2 className="card-title" style={{ marginBottom: 8 }}>
        아직 재무상태표를 만들 결산이 없어요
      </h2>
      <p className="caption" style={{ fontSize: 14, lineHeight: 1.6 }}>
        월별 결산에서 자산·부채를 등록하고 금액을 입력하면, 그 달 기준으로 재무상태표가 만들어져요.
      </p>
      <Link to="/settle" className="btn btn--primary" style={{ marginTop: 20, textDecoration: 'none' }}>
        월별 결산 입력하기
      </Link>
    </Card>
  )
}

/** 불러오기 실패 */
export function BalanceError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card>
      <p role="alert" style={{ color: 'var(--bad)', fontWeight: 600 }}>
        {message}
      </p>
      <Button variant="secondary" style={{ marginTop: 12 }} onClick={onRetry}>
        다시 불러오기
      </Button>
    </Card>
  )
}

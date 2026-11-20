/** 확정 로고: 시안 1 · Two Leaves (함께 자라는 새싹) */
interface LogoMarkProps {
  size?: number
  /** 앱 아이콘처럼 진한 배경 위에 올릴 때 */
  inverse?: boolean
}

export function LogoMark({ size = 28, inverse = false }: LogoMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="가치성장">
      <path d="M32 36.2 C34.5 22 43 9 57 7 C57.5 22.5 48 34.6 32 36.2 Z" fill="#3CC8DC" />
      <path
        d="M29.8 56 C29.8 47 30.2 41.5 30.6 37.6 C24.5 37 12.5 31.5 9 17 C22 15.5 33 25 33.4 34.5 C33.7 41 34.2 47 34.2 56 C34.2 59 29.8 59 29.8 56 Z"
        fill={inverse ? '#FFFFFF' : '#5B4BE0'}
      />
    </svg>
  )
}

export function Logo({ size = 28, textSize = 17 }: { size?: number; textSize?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} />
      <span style={{ fontWeight: 700, fontSize: textSize, letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1 }}>
        가치성장
      </span>
    </span>
  )
}

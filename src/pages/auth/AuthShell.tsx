import type { ReactNode } from 'react'
import { Card, Logo } from '../../components/ui'
import './auth.css'

/** 로그인 계열 화면 공통 틀: 로고 + 가운데 카드 */
export function AuthShell({ title, desc, children, footer }: { title: string; desc?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="auth-page">
      <Logo size={36} textSize={22} />
      <Card className="auth-card" as="section" aria-label={title}>
        <h1 className="auth-title">{title}</h1>
        {desc && <p className="auth-desc">{desc}</p>}
        {children}
      </Card>
      {footer && <div className="auth-alt">{footer}</div>}
    </main>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="auth-error" role="alert">
      {message}
    </div>
  )
}

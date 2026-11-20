import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, TextField } from '../../components/ui'
import { supabase, toKoreanError } from '../../lib/supabase'
import { AuthShell, FormError } from './AuthShell'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    // 성공하면 AuthProvider가 세션을 받아 RequireGuest가 앱으로 보냄
    if (err) setError(toKoreanError(err))
  }

  return (
    <AuthShell
      title="로그인"
      desc="둘이 함께 쓰는 자산 장부에 들어가요."
      footer={
        <>
          처음이신가요? <Link to="/signup">회원가입</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <TextField id="login-email" label="이메일" type="email" autoComplete="email" value={email} onChange={setEmail} required autoFocus />
        <TextField
          id="login-password"
          label="비밀번호"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          required
        />
        <FormError message={error} />
        <Button type="submit" block disabled={busy || !email || !password}>
          {busy ? '로그인 중…' : '로그인'}
        </Button>
      </form>
    </AuthShell>
  )
}

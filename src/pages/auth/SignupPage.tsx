import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, TextField } from '../../components/ui'
import { supabase, toKoreanError } from '../../lib/supabase'
import { AuthShell, FormError } from './AuthShell'

const MIN_PASSWORD = 8

export function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /** 메일 확인이 켜진 프로젝트에서 가입 직후 */
  const [sentTo, setSentTo] = useState<string | null>(null)

  const mismatch = password2.length > 0 && password !== password2
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (mismatch || tooShort) return
    setError(null)
    setBusy(true)
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    })
    setBusy(false)
    if (err) return setError(toKoreanError(err))
    // 메일 확인이 필요하면 세션이 없음 → 안내. 바로 세션이 생기면 가구 연결 화면으로 자동 이동
    if (!data.session) setSentTo(email.trim())
  }

  if (sentTo) {
    return (
      <AuthShell title="메일을 확인해 주세요" footer={<Link to="/login">로그인으로 돌아가기</Link>}>
        <p className="auth-notice" style={{ marginTop: 16 }}>
          <b>{sentTo}</b>로 가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="회원가입"
      desc="가입한 뒤 '우리 집'을 만들거나, 배우자에게 받은 초대 코드로 참여해요."
      footer={
        <>
          이미 계정이 있나요? <Link to="/login">로그인</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <TextField id="signup-email" label="이메일" type="email" autoComplete="email" value={email} onChange={setEmail} required autoFocus />
        <TextField
          id="signup-password"
          label="비밀번호"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          required
          minLength={MIN_PASSWORD}
          help={`${MIN_PASSWORD}자 이상`}
          error={tooShort ? `${MIN_PASSWORD}자 이상 입력해 주세요` : undefined}
        />
        <TextField
          id="signup-password2"
          label="비밀번호 확인"
          type="password"
          autoComplete="new-password"
          value={password2}
          onChange={setPassword2}
          required
          error={mismatch ? '비밀번호가 서로 달라요' : undefined}
        />
        <FormError message={error} />
        <Button type="submit" block disabled={busy || !email || !password || !password2 || mismatch || tooShort}>
          {busy ? '가입 중…' : '가입하기'}
        </Button>
      </form>
    </AuthShell>
  )
}

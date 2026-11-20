import { useState, type FormEvent } from 'react'
import { useAuth, type MemberRole } from '../../auth/AuthProvider'
import { Button, Segmented, Switch, TextField } from '../../components/ui'
import { supabase, toKoreanError } from '../../lib/supabase'
import { AuthShell, FormError } from './AuthShell'

const ROLE_LABEL: Record<MemberRole, string> = { husband: '남편', wife: '아내' }
const roleFromLabel = (label: string): MemberRole => (label === '아내' ? 'wife' : 'husband')

/** 로그인 후 가구가 없을 때: 새 가구 만들기 또는 초대 코드로 참여 */
export function OnboardingPage() {
  const { refreshHousehold, signOut, user } = useAuth()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<MemberRole>('husband')
  const [householdName, setHouseholdName] = useState('우리 집')
  const [code, setCode] = useState('')
  /** 디자인 시안의 예시 값으로 채워서 시작 (나중에 My 메뉴에서 지울 수 있음) */
  const [withSample, setWithSample] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const canSubmit = displayName.trim() && (mode === 'create' ? householdName.trim() : code.trim().length === 8)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setBusy(true)
    const { error: err } =
      mode === 'create'
        ? await supabase.rpc('create_household', { p_name: householdName, p_role: role, p_display_name: displayName, p_with_sample: withSample })
        : await supabase.rpc('join_household', { p_code: code, p_role: role, p_display_name: displayName })
    if (err) {
      setBusy(false)
      return setError(toKoreanError(err))
    }
    // 가구가 생기면 RequireSessionWithoutHousehold가 앱으로 보냄
    await refreshHousehold()
    setBusy(false)
  }

  return (
    <AuthShell
      title="우리 집 연결하기"
      desc="두 사람이 같은 장부를 보려면 한 사람이 가구를 만들고, 배우자는 초대 코드로 참여해요."
      footer={
        <>
          {user?.email}
          <Button variant="ghost" size="sm" onClick={() => void signOut()} style={{ marginLeft: 4 }}>
            로그아웃
          </Button>
        </>
      }
    >
      <OnboardingTabs mode={mode} onChange={setMode} />
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {mode === 'create' ? (
          <TextField id="ob-household" label="가구 이름" value={householdName} onChange={setHouseholdName} maxLength={40} required />
        ) : (
          <TextField
            id="ob-code"
            label="초대 코드"
            value={code}
            onChange={(v) => setCode(v.replace(/[^0-9a-z]/gi, '').slice(0, 8))}
            placeholder="8자리"
            help="배우자의 My 메뉴에서 확인할 수 있어요"
            uppercase
            required
          />
        )}
        <TextField
          id="ob-name"
          label="내 이름"
          value={displayName}
          onChange={setDisplayName}
          maxLength={20}
          help="장부에서 서로를 구분할 때 보여요"
          required
        />
        <div className="field">
          <span className="label" id="ob-role-label">
            나는
          </span>
          <Segmented
            label="역할"
            block
            options={[ROLE_LABEL.husband, ROLE_LABEL.wife]}
            value={ROLE_LABEL[role]}
            onChange={(v) => setRole(roleFromLabel(v))}
          />
        </div>
        {mode === 'create' && (
          <div>
            <Switch label="예시 데이터로 시작하기" checked={withSample} onChange={setWithSample} />
            <p className="field__help" style={{ marginTop: 6 }}>
              자산·부채, 12개월 결산, 예산이 예시 값으로 채워져요. My 메뉴에서 언제든 지울 수 있어요.
            </p>
          </div>
        )}
        <FormError message={error} />
        <Button type="submit" block disabled={busy || !canSubmit}>
          {busy ? '연결 중…' : mode === 'create' ? '가구 만들기' : '참여하기'}
        </Button>
      </form>
    </AuthShell>
  )
}

/** 만들기 / 참여 전환 탭 (공용 Tabs는 선택 상태를 밖에 알려 주지 않아 여기서 직접 제어) */
function OnboardingTabs({ mode, onChange }: { mode: 'create' | 'join'; onChange: (m: 'create' | 'join') => void }) {
  return (
    <div role="tablist" className="tabs" style={{ marginTop: 16 }}>
      {(
        [
          ['create', '새 가구 만들기'],
          ['join', '초대 코드로 참여'],
        ] as const
      ).map(([key, label]) => (
        <button key={key} type="button" role="tab" aria-selected={mode === key} className="tabs__tab" onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
    </div>
  )
}

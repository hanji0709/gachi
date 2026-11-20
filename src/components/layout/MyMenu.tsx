import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { supabase, toKoreanError } from '../../lib/supabase'
import { Button, Dot, Icon, OWNER_COLOR } from '../ui'

const ROLE_LABEL = { husband: '남편', wife: '아내' } as const

/** 헤더 My 버튼 + 메뉴: 가구 이름 · 초대 코드 복사 · 구성원 · 로그아웃 */
export function MyMenu({ mobile }: { mobile?: boolean }) {
  const { household, members, me, user, signOut, refreshHousehold } = useAuth()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  // 바깥 클릭·Esc로 닫기
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const copyCode = async () => {
    if (!household) return
    try {
      await navigator.clipboard.writeText(household.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // 클립보드 권한이 없으면 코드가 화면에 보이므로 그대로 둠
    }
  }

  const [clearing, setClearing] = useState(false)
  const [clearError, setClearError] = useState<string | null>(null)
  /** 예시 데이터 지우기: 예시로 넣은 자산·부채·결산월과 예산을 지움 (직접 추가한 자산·부채는 남음) */
  const clearSample = async () => {
    const ok = window.confirm(
      '예시 데이터를 지울까요?\n\n예시 자산·부채, 예시 결산(2025-11 ~ 2026-10)과 그 안에 입력한 값, 변동비 예산이 모두 지워져요. 직접 추가한 자산·부채는 남아요. 되돌릴 수 없어요.',
    )
    if (!ok) return
    setClearing(true)
    setClearError(null)
    const { error } = await supabase.rpc('clear_sample_data')
    setClearing(false)
    if (error) return setClearError(toKoreanError(error))
    // 화면 데이터는 Realtime 변경 알림으로 자동 갱신, 가구 정보(예시 여부)는 직접 다시 불러옴
    await refreshHousehold()
    setOpen(false)
  }

  const waitingForSpouse = members.length < 2

  return (
    <div className="my-menu" ref={wrapRef}>
      <button
        type="button"
        className={mobile ? 'my-btn my-btn--m' : 'my-btn'}
        aria-label="My 메뉴 열기"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        My
        {!mobile && <Icon name="chevronDown" size={16} strokeWidth={2} />}
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label="My 메뉴" className="my-menu__panel">
          <div className="my-menu__section">
            <div className="label">우리 집</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>{household?.name}</div>
            <ul className="my-menu__members">
              {members.map((m) => (
                <li key={m.userId}>
                  <Dot color={OWNER_COLOR[ROLE_LABEL[m.role]]} />
                  {m.displayName}
                  <span className="micro">
                    {ROLE_LABEL[m.role]}
                    {m.userId === me?.userId ? ' · 나' : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="my-menu__section">
            <div className="label">초대 코드</div>
            <div className="my-menu__code">
              <span>{household?.inviteCode}</span>
              <Button variant="secondary" size="sm" role="menuitem" onClick={() => void copyCode()}>
                {copied ? '복사됨' : '복사'}
              </Button>
            </div>
            <p className="micro" style={{ marginTop: 6 }}>
              {waitingForSpouse ? '배우자가 회원가입 후 이 코드로 참여하면 같은 장부를 함께 봐요.' : '두 사람 모두 참여했어요.'}
            </p>
          </div>

          {household?.hasSample && (
            <div className="my-menu__section">
              <div className="label">예시 데이터</div>
              <p className="micro" style={{ margin: '4px 0 10px' }}>
                처음 만들 때 넣은 예시 자산·부채, 결산, 예산이 들어 있어요. 실제로 쓰기 전에 지워 주세요.
              </p>
              {clearError && (
                <p role="alert" className="micro" style={{ color: 'var(--bad)', fontWeight: 600, marginBottom: 8 }}>
                  {clearError}
                </p>
              )}
              <Button variant="danger" size="sm" block role="menuitem" disabled={clearing} onClick={() => void clearSample()}>
                {clearing ? '지우는 중…' : '예시 데이터 지우기'}
              </Button>
            </div>
          )}

          <div className="my-menu__section my-menu__footer">
            <span className="micro" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" role="menuitem" onClick={() => void signOut()}>
              로그아웃
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

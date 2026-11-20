import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { closeHouseholdRealtime } from '../data/realtime'
import { supabase } from '../lib/supabase'

export type MemberRole = 'husband' | 'wife'

export interface Household {
  id: string
  name: string
  inviteCode: string
  /** 가구를 만들 때 넣은 예시 데이터가 남아 있는지 (My 메뉴에서 지울 수 있음) */
  hasSample: boolean
}

export interface Member {
  userId: string
  role: MemberRole
  displayName: string
}

interface AuthState {
  /** 세션 확인 중 (첫 로드) */
  loading: boolean
  session: Session | null
  user: User | null
  /** 내가 속한 가구 (없으면 가구 만들기/참여 화면으로) */
  household: Household | null
  /** 가구 구성원 (나 포함, 최대 2명) */
  members: Member[]
  me: Member | null
  /** 가구 정보를 다시 불러옴 (가구 생성·참여 뒤) */
  refreshHousehold: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있어요')
  return v
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  /**
   * 가구 정보를 한 번이라도 불러온 사용자 id.
   * 세션이 막 복원된 순간에는 아직 가구를 모르므로 '불러오는 중'으로 봐야 한다.
   * (안 그러면 새로고침·주소 직접 입력 시 '가구 없음'으로 오해해 다른 화면으로 튕김)
   * 이후 다시 불러올 때는 화면을 로딩으로 덮지 않는다.
   */
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<Member[]>([])

  // 세션: 첫 로드 + 로그인/로그아웃/토큰 갱신 구독
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id ?? null

  const refreshHousehold = useCallback(async () => {
    if (!userId) {
      setHousehold(null)
      setMembers([])
      return
    }
    try {
      const { data: mine, error } = await supabase
        .from('household_members')
        .select('household:households(id, name, invite_code, has_sample)')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      const h = (mine?.household ?? null) as { id: string; name: string; invite_code: string; has_sample: boolean } | null
      if (!h) {
        setHousehold(null)
        setMembers([])
        return
      }
      const { data: rows, error: mErr } = await supabase
        .from('household_members')
        .select('user_id, role, display_name')
        .eq('household_id', h.id)
        .order('joined_at')
      if (mErr) throw mErr
      setHousehold({ id: h.id, name: h.name, inviteCode: h.invite_code, hasSample: h.has_sample })
      setMembers(
        (rows ?? []).map((r) => ({ userId: r.user_id as string, role: r.role as MemberRole, displayName: r.display_name as string })),
      )
    } finally {
      setLoadedFor(userId)
    }
  }, [userId])

  useEffect(() => {
    void refreshHousehold()
  }, [refreshHousehold])

  const signOut = useCallback(async () => {
    closeHouseholdRealtime()
    await supabase.auth.signOut()
  }, [])

  const value: AuthState = {
    loading: sessionLoading || (userId !== null && loadedFor !== userId),
    session,
    user: session?.user ?? null,
    household,
    members,
    me: members.find((m) => m.userId === userId) ?? null,
    refreshHousehold,
    signOut,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

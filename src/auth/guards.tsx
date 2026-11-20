import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LogoMark } from '../components/ui'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthProvider'

/** 첫 로드 중 화면 */
export function FullScreenLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }} aria-busy="true" aria-label="불러오는 중">
      <LogoMark size={44} />
    </div>
  )
}

/** .env.local이 없을 때 안내 */
function NotConfigured() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 480 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Supabase 설정이 필요해요</h1>
        <p className="caption" style={{ fontSize: 14, lineHeight: 1.6 }}>
          프로젝트 폴더의 <code>.env.example</code>을 <code>.env.local</code>로 복사하고 VITE_SUPABASE_URL,
          VITE_SUPABASE_ANON_KEY를 채운 뒤 개발 서버를 다시 시작해 주세요.
        </p>
      </div>
    </div>
  )
}

/** 로그인 + 가구 연결이 끝난 사용자만 앱 화면으로 */
export function RequireHousehold({ children }: { children: ReactNode }) {
  const { loading, session, household } = useAuth()
  const location = useLocation()
  if (!isSupabaseConfigured) return <NotConfigured />
  if (loading) return <FullScreenLoading />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!household) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

/** 로그인은 했지만 가구가 없는 사용자만 (가구 만들기/참여 화면) */
export function RequireSessionWithoutHousehold({ children }: { children: ReactNode }) {
  const { loading, session, household } = useAuth()
  if (!isSupabaseConfigured) return <NotConfigured />
  if (loading) return <FullScreenLoading />
  if (!session) return <Navigate to="/login" replace />
  if (household) return <Navigate to="/balance" replace />
  return <>{children}</>
}

/** 로그인하지 않은 사용자만 (로그인·회원가입 화면) */
export function RequireGuest({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth()
  const location = useLocation()
  if (!isSupabaseConfigured) return <NotConfigured />
  if (loading) return <FullScreenLoading />
  if (session) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/login' ? from : '/balance'} replace />
  }
  return <>{children}</>
}

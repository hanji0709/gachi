import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** .env.local에 Supabase 설정이 있는지 */
export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Supabase 클라이언트 (브라우저용 anon 키).
 * 데이터 접근 권한은 DB의 RLS 정책이 가구 단위로 제한한다.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(url ?? 'http://localhost', anonKey ?? 'missing-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true },
})

/** Supabase Auth 오류 코드별 안내 (https://supabase.com/docs/guides/auth/debugging/error-codes) */
const AUTH_CODE_KO: Record<string, string> = {
  invalid_credentials: '이메일 또는 비밀번호가 맞지 않아요.',
  email_not_confirmed: '메일함에서 가입 확인 링크를 먼저 눌러 주세요.',
  user_already_exists: '이미 가입된 이메일이에요. 로그인해 주세요.',
  email_exists: '이미 가입된 이메일이에요. 로그인해 주세요.',
  email_address_invalid: '사용할 수 없는 이메일 주소예요. 다른 주소로 시도해 주세요.',
  email_address_not_authorized: '지금은 이 이메일로 가입 확인 메일을 보낼 수 없어요. 관리자에게 문의해 주세요.',
  weak_password: '비밀번호가 너무 단순해요. 더 길고 복잡하게 만들어 주세요.',
  over_email_send_rate_limit: '확인 메일을 너무 자주 보냈어요. 잠시 후 다시 시도해 주세요.',
  over_request_rate_limit: '요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.',
  signup_disabled: '지금은 새 가입을 받지 않아요.',
}

/** Supabase/Postgres 오류를 화면에 보여줄 한국어 문장으로 */
export function toKoreanError(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: unknown }).code) : ''
  if (AUTH_CODE_KO[code]) return AUTH_CODE_KO[code]
  const message = typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : String(err)
  const map: [RegExp, string][] = [
    [/Invalid login credentials/i, '이메일 또는 비밀번호가 맞지 않아요.'],
    [/Email not confirmed/i, '메일함에서 가입 확인 링크를 먼저 눌러 주세요.'],
    [/User already registered/i, '이미 가입된 이메일이에요. 로그인해 주세요.'],
    [/Password should be at least (\d+)/i, '비밀번호는 6자 이상이어야 해요.'],
    [/Unable to validate email address|invalid format/i, '이메일 주소 형식을 확인해 주세요.'],
    [/rate limit/i, '요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.'],
    [/Failed to fetch|NetworkError/i, '서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.'],
  ]
  for (const [re, ko] of map) if (re.test(message)) return ko
  // DB 함수(create_household 등)가 보내는 한국어 메시지는 그대로
  if (/[가-힣]/.test(message)) return message
  return '문제가 생겼어요. 잠시 후 다시 시도해 주세요.'
}

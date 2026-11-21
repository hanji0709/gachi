import { useEffect } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

/**
 * 가구 하나당 Realtime 데이터 채널(`household:<id>`) 하나를 세션 내내 유지한다.
 * 배우자가 저장한 값·마감 상태가 내 화면에 바로 반영되도록 DB 변경(postgres_changes)만 받는다.
 *
 * 화면(월·페이지)이 바뀔 때마다 채널을 지우고 같은 이름으로 다시 만들면 supabase-js가 아직 정리 중인
 * 예전 채널을 그대로 돌려줘 실시간이 끊긴다. 그래서 채널은 여기서 한 번만 만들고, 화면은 리스너만
 * 등록·해제한다. 채널이 닫히거나 오류가 나면 잠시 뒤 다시 연결하고, 놓친 변경을 위해 다시 불러오게 한다.
 */

const TABLES = ['settlements', 'accounts', 'pnl_items', 'account_balances', 'pnl_entries', 'sector_amounts', 'cash_items', 'cash_months'] as const
export type RealtimeTable = (typeof TABLES)[number]

/** 재연결: 2초부터 두 배씩, 최대 30초 */
const RETRY_BASE_MS = 2000
const RETRY_MAX_MS = 30000

interface Hub {
  householdId: string
  closed: boolean
  channel: RealtimeChannel | null
  retries: number
  listeners: Set<(table: RealtimeTable | 'reconnect') => void>
}

let hub: Hub | null = null

function connect(h: Hub) {
  const channel = supabase.channel(`household:${h.householdId}`)
  h.channel = channel
  for (const table of TABLES) {
    // 가구 id가 있는 테이블은 필터, 결산 하위 테이블은 RLS가 같은 가구 변경만 전달
    const filter = ['settlements', 'accounts', 'pnl_items', 'cash_items', 'cash_months'].includes(table) ? `household_id=eq.${h.householdId}` : undefined
    channel.on('postgres_changes', { event: '*', schema: 'public', table, filter }, () => h.listeners.forEach((l) => l(table)))
  }
  channel.subscribe((status) => {
    if (h.closed || h.channel !== channel) return
    if (status === 'SUBSCRIBED') {
      // 끊긴 동안 놓친 변경이 있을 수 있으니 다시 불러오게 함
      if (h.retries > 0) h.listeners.forEach((l) => l('reconnect'))
      h.retries = 0
      return
    }
    // CLOSED · CHANNEL_ERROR · TIMED_OUT → 정리 후 다시 연결
    h.channel = null
    const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** h.retries++)
    void supabase.removeChannel(channel).finally(() => {
      window.setTimeout(() => {
        if (!h.closed && hub === h && !h.channel) connect(h)
      }, delay)
    })
  })
}

function openHub(householdId: string): Hub {
  if (hub && hub.householdId === householdId) return hub
  closeHouseholdRealtime()
  const h: Hub = { householdId, closed: false, channel: null, retries: 0, listeners: new Set() }
  hub = h
  connect(h)
  return h
}

/** 로그아웃·가구 변경 시 채널 정리 */
export function closeHouseholdRealtime() {
  if (!hub) return
  hub.closed = true
  if (hub.channel) void supabase.removeChannel(hub.channel)
  hub = null
}

/**
 * 가구 데이터 변경 구독.
 * @param onChange 테이블이 바뀌거나 재연결되면 호출 (여러 번 올 수 있으니 받는 쪽에서 모아서 처리)
 */
export function useHouseholdRealtime(onChange: (table: RealtimeTable | 'reconnect') => void) {
  const { household } = useAuth()
  const householdId = household?.id
  useEffect(() => {
    if (!householdId) return
    const h = openHub(householdId)
    h.listeners.add(onChange)
    return () => {
      h.listeners.delete(onChange)
    }
  }, [householdId, onChange])
}

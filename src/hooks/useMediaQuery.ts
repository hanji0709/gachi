import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** 768px 미만이면 모바일 화면(하단 탭)으로 전환 */
export const MOBILE_QUERY = '(max-width: 767px)'

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY)
}

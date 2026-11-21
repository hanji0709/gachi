import { useLayoutEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { PageTransition } from '../../animation/PageTransition'
import { SmoothScroll } from '../../animation/SmoothScroll'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { NAV_ITEMS, findNavItem } from '../../navigation'
import { Icon, Logo } from '../ui'
import { MyMenu } from './MyMenu'
import { SoloNotice } from './SoloNotice'
import './layout.css'

export function AppLayout() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileShell /> : <PcShell />
}

/**
 * 고정 헤더의 실제 높이를 --header-h로 내보냄.
 * 헤더는 스무스 스크롤 영역 밖에 position: fixed로 있으므로, 본문은 이만큼 띄워서 시작한다.
 */
function useHeaderHeight() {
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const apply = () => document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return ref
}

/* ───────── PC: 상단 메뉴 ───────── */
function PcShell() {
  const headerRef = useHeaderHeight()
  return (
    <>
      <header className="pc-header" ref={headerRef}>
        <div className="pc-header__inner">
          <Link to="/balance" className="pc-header__brand">
            <Logo size={28} textSize={17} />
          </Link>
          <nav aria-label="메인 메뉴" className="pc-nav">
            {NAV_ITEMS.map((n) => (
              <NavLink key={n.path} to={n.path} className="pc-nav__link">
                {n.pcLabel}
              </NavLink>
            ))}
          </nav>
          <div className="pc-header__actions">
            <MyMenu />
          </div>
        </div>
      </header>
      <SmoothScroll>
        <main className="pc-main">
          <PageTransition />
        </main>
      </SmoothScroll>
      <SoloNotice />
    </>
  )
}

/* ───────── 모바일: 상단 제목 + 하단 탭 ───────── */
function MobileShell() {
  const { pathname } = useLocation()
  const headerRef = useHeaderHeight()
  const current = findNavItem(pathname)
  return (
    <>
      <header className="m-header" ref={headerRef}>
        <h1 className="m-header__title">{current?.mTitle ?? '가치성장'}</h1>
        <MyMenu mobile />
      </header>
      <SmoothScroll>
        <main className="m-main">
          <PageTransition />
        </main>
      </SmoothScroll>
      <SoloNotice />
      <nav aria-label="메인 메뉴" className="bottom-nav">
        {NAV_ITEMS.map((n) => (
          <NavLink key={n.path} to={n.path} className="bottom-nav__link">
            <Icon name={n.icon} size={24} strokeWidth={1.8} />
            <span className="bottom-nav__label">{n.mLabel}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}

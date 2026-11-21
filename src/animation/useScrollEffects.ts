import type { RefObject } from 'react'
import { gsap, prefersReducedMotion, ScrollTrigger, useGSAP, type ScrollSmoother } from './gsap'
import { SLOT_DELAY } from './SlotNumber'

/**
 * 페이지 공통 스크롤 애니메이션 (페이지 코드를 건드리지 않고 클래스 기준으로 적용)
 * - 카드: 화면에 들어올 때 아래에서 떠오르며 나타남 (순차)
 * - 페이지 제목 줄 / 모바일 순자산 카드: 스크롤보다 느리게 움직이며 흐려짐 (패럴랙스)
 * - 카드 안 차트·도넛·구성 막대: 카드보다 살짝 다른 속도로 움직임 (패럴랙스)
 */
export function useScrollEffects(scope: RefObject<HTMLElement>, pageKey: string, smoother: ScrollSmoother | null) {
  useGSAP(
    (_ctx, contextSafe) => {
      const root = scope.current
      if (!root || prefersReducedMotion()) return

      const triggers: ScrollTrigger[] = []

      // 1) 카드 등장
      const cards = gsap.utils.toArray<HTMLElement>('.card', root)
      // opacity만 사용: visibility: hidden이면 아직 안 나타난 카드에 키보드(Tab) 포커스가 갈 수 없음
      gsap.set(cards, { opacity: 0, y: 48 })
      triggers.push(
        ...ScrollTrigger.batch(cards, {
          start: 'top 92%',
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: 'power3.out',
              stagger: 0.08,
              overwrite: true,
              clearProps: 'transform',
            }),
        }),
      )

      // 2) 제목 줄: 스크롤보다 느리게 + 흐려짐
      // 제목은 처음부터 화면 맨 위(고정 헤더 바로 아래)에 있으므로 clamp()로 "스크롤을 시작한 뒤"부터만 적용.
      // clamp가 없으면 시작 지점이 스크롤 0보다 앞서 계산돼 첫 화면에서 이미 흐려지거나 밀려 보인다.
      if (smoother) {
        triggers.push(...smoother.effects('.page-head', { speed: 'clamp(0.88)' }))
      }
      // 시작 값을 '완전히 보임'으로 명시 (to만 쓰면 화면 전환 중 값이 시작 값으로 기록될 수 있음)
      gsap.utils.toArray<HTMLElement>('.page-head', root).forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 1 },
          {
            autoAlpha: 0.15,
            ease: 'none',
            immediateRender: false,
            scrollTrigger: { trigger: el, start: 'clamp(top 15%)', end: 'clamp(bottom top)', scrub: true },
          },
        )
      })

      // 3) 카드 안 시각 요소: 스크롤에 따라 위로 살짝 더 이동
      const visuals = gsap.utils.toArray<HTMLElement>(
        // 상세 팝업이 붙은 그래프는 팝업과 함께 움직이도록 SVG 대신 감싸는 .chart-hover를 움직임
        // 도넛·구성 막대는 바로 옆·아래 범례와 줄이 맞아야 하므로 제외 (따로 움직이면 어긋나 보임)
        '.card svg[role="img"]:not(.chart-hover svg), .card .chart-hover, .card--hero > *',
        root,
      )
      visuals.forEach((el) => {
        gsap.fromTo(
          el,
          { y: 14 },
          {
            y: -14,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
          },
        )
      })

      // 4) 그래프 채우기: 영역이 화면에 들어오기 시작하면 1회 재생 (data-chart-reveal을 단 그래프만)
      // 실제 데이터는 페이지가 바뀐 뒤 늦게 도착해 그래프도 나중에 그려지므로,
      // 처음에 있던 그래프 + 이후 새로 그려지는 그래프(MutationObserver)를 모두 처리한다.
      const revealed = new WeakSet<HTMLElement>()
      const setupReveal = (el: HTMLElement) => {
        if (revealed.has(el)) return
        revealed.add(el)
        const scrollTrigger = { trigger: el, start: 'top 90%', once: true }
        switch (el.dataset.chartReveal) {
          // 막대: 왼쪽 → 오른쪽으로 드러남
          // data-chart-duration이 있으면(홈 막대) 그 시간 동안, 슬롯 숫자와 같은 지연·감속으로
          case 'bar': {
            const synced = el.dataset.chartDuration !== undefined
            gsap.fromTo(
              el,
              { clipPath: 'inset(0% 100% 0% 0%)' },
              {
                clipPath: 'inset(0% 0% 0% 0%)',
                duration: synced ? Number(el.dataset.chartDuration) : 0.88,
                delay: synced ? SLOT_DELAY : 0,
                ease: synced ? 'sine.out' : 'power2.out',
                clearProps: 'clipPath',
                scrollTrigger,
              },
            )
            break
          }
          // 도넛: 12시 방향부터 시계 방향으로 채워짐 (.donut__ring의 --p 0 → 1)
          case 'donut': {
            const ring = el.querySelector('.donut__ring')
            if (ring) {
              // 그리는 동안만 트랙·마스크 사용 (끝나면 떼어 배경과 어긋나 보이지 않게)
              el.classList.add('is-revealing')
              gsap.fromTo(
                ring,
                { '--p': 0 },
                { '--p': 1, duration: 1.4, ease: 'power2.out', scrollTrigger, onComplete: () => el.classList.remove('is-revealing') },
              )
            }
            break
          }
          // 선 그래프: 클립 사각형 폭을 늘려 왼쪽 → 오른쪽으로 그려짐
          case 'line': {
            const rect = el.querySelector<SVGRectElement>('[data-reveal-rect]')
            if (rect) {
              const full = Number(rect.dataset.fullWidth)
              gsap.fromTo(rect, { attr: { width: 0 } }, { attr: { width: full }, duration: 1.6, ease: 'power2.inOut', scrollTrigger })
            }
            break
          }
        }
      }
      gsap.utils.toArray<HTMLElement>('[data-chart-reveal]', root).forEach(setupReveal)

      let refreshTimer = 0
      const onMutate = contextSafe!((records: MutationRecord[]) => {
        let added = false
        for (const r of records) {
          r.addedNodes.forEach((n) => {
            if (!(n instanceof HTMLElement || n instanceof SVGElement)) return
            const found = [n, ...n.querySelectorAll('[data-chart-reveal]')].filter(
              (e): e is HTMLElement => e instanceof Element && (e as HTMLElement).dataset?.chartReveal !== undefined,
            )
            found.forEach(setupReveal)
            added = true
          })
        }
        // 늦게 들어온 내용으로 페이지 높이가 바뀌므로 스크롤 위치 계산을 다시 함
        if (added) {
          window.clearTimeout(refreshTimer)
          refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 120)
        }
      })
      const observer = new MutationObserver(onMutate)
      observer.observe(root, { childList: true, subtree: true })

      // 웹폰트·차트 크기 반영
      ScrollTrigger.refresh()

      return () => {
        observer.disconnect()
        window.clearTimeout(refreshTimer)
        triggers.forEach((t) => t.kill())
      }
    },
    { scope, dependencies: [pageKey, smoother], revertOnUpdate: true },
  )
}

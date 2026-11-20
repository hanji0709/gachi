# 가치성장 (부부 공동 자산관리) — UI

Vite + React + TypeScript. 디자인 시안을 코드로 옮긴 **UI 단계**입니다. 숫자는 모두 시안의 예시 데이터이며 기능(저장·계산·API)은 아직 없습니다.

## 실행

```bash
npm install
npm run dev
```

화면 폭 768px 미만이면 모바일 화면(하단 탭), 그 이상이면 PC 화면(상단 메뉴)으로 바뀝니다.

## 구조

```
src/
  styles/tokens.css        컬러·모서리·그림자 토큰 (스타일 가이드 1·3)
  styles/global.css        기본 스타일, Pretendard, 숫자 폭 고정
  components/ui/           공통 컴포넌트 (Card, StatCard, Button, Segmented, OwnerChips,
                           Badge, Switch, Tabs, MoneyField, DataTable, StackBar, Donut ...)
  components/layout/       PC 상단 메뉴 · 모바일 헤더/하단 탭 · 빠른 입력 시트
  navigation.ts            메뉴 정의
  pages/
    balance/  재무상태표          /balance
    settle/   월별 결산           /settle
    pnl/      기간별 손익 분석     /pnl
    cash/     월 현금흐름         /cash
    fire/     경제적 자유         /fire, /fire/forecast
```

## Supabase (로그인 · 데이터)

- 프로젝트: `gachi` (서울 ap-northeast-2). 접속 정보는 `.env.local` (git 제외). 새 환경에서는 `.env.example`을 복사해 채우세요.
- 스키마: `supabase/migrations/` 의 SQL을 순서대로 적용
  - 가구(`households`) · 구성원(`household_members`, 최대 2명, 남편/아내)
  - 자산·부채(`accounts`), 월별 결산(`settlements`), 결산월별 잔액(`account_balances`)
  - 손익 항목·금액(`pnl_items`, `pnl_entries`), 금융투자 섹터 금액(`sector_amounts`)
  - RLS: 같은 가구 구성원만 읽기·쓰기. 가구 만들기·참여는 `create_household` / `join_household` 함수로만.
- 흐름: 회원가입 → 로그인 → 가구 만들기(초대 코드 발급) 또는 초대 코드로 참여 → 앱. My 메뉴에서 초대 코드 확인·로그아웃.
- 데이터 코드는 `src/data/`
  - `ledger.ts` 조회·저장 함수, `compute.ts` 손익·재무상태표 계산(순수 함수)
  - `useSettlement.ts` 월별 결산 한 달(입력 즉시 화면 반영 → 저장, 배우자 변경 자동 반영)
  - `useBalanceSheet.ts` 재무상태표(전체 결산월 잔액으로 전월 대비·추이 계산)
  - `realtime.ts` 가구당 Realtime 채널 하나를 세션 내내 유지 (화면은 리스너만 등록). 끊기면 자동 재연결 후 다시 불러옴
  - DB 타입 `src/lib/database.types.ts`는 Supabase가 생성. 스키마를 바꾸면 다시 생성
- 계산 규칙: 불일치 차액 = (수입 − 고정·변동지출) − 투자·저축/상환, 저축/투자율 = 투자·저축/상환 ÷ 수입, DSR = (대출 원금 + 대출 이자) ÷ 수입, 부채비율 = 총부채 ÷ 총자산
- 결산 마감: 구성원 모두 '확인' → 마감(입력 잠김). 혼자인 가구는 본인만 확인. 마감 해제 시 확인도 초기화

## 애니메이션 (GSAP)

`src/animation/`에 모여 있습니다. 페이지 코드는 건드리지 않고 클래스(`.card`, `.page-head` 등) 기준으로 적용됩니다.

- `SmoothScroll.tsx`: ScrollSmoother 부드러운 스크롤. 내용이 transform으로 움직이므로 **position: fixed / sticky 요소는 `<FixedLayer>`(body로 portal)로 렌더하거나 `useSmoothPin`을 쓰세요.**
- `PageTransition.tsx`: 화면 전환(이전 화면 흐리게 퇴장 → 새 화면 떠오름, 상단 진행 막대)
- `useScrollEffects.ts`: 카드 순차 등장, 제목 줄 패럴랙스, 카드 안 차트 패럴랙스
- `useSmoothPin.ts`: sticky 대체(월별 결산 오른쪽 요약)
- OS의 '동작 줄이기' 설정이 켜져 있으면 모두 꺼지고 기본 스크롤로 동작합니다.

각 페이지 폴더는 `Pc*.tsx`(PC)와 `M*.tsx`(모바일)를 따로 두고 `index.tsx`에서 화면 폭에 따라 고릅니다.

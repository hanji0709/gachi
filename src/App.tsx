import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireGuest, RequireHousehold, RequireSessionWithoutHousehold } from './auth/guards'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { OnboardingPage } from './pages/auth/OnboardingPage'
import { SignupPage } from './pages/auth/SignupPage'
import { BalancePage } from './pages/balance'
import { CashPage } from './pages/cash'
import { FirePage, ForecastPage } from './pages/fire'
import { PnlPage } from './pages/pnl'
import { SettlePage } from './pages/settle'

export default function App() {
  return (
    <Routes>
      {/* 로그인 전 */}
      <Route path="/login" element={<RequireGuest><LoginPage /></RequireGuest>} />
      <Route path="/signup" element={<RequireGuest><SignupPage /></RequireGuest>} />
      {/* 로그인 후 가구 연결 전 */}
      <Route path="/onboarding" element={<RequireSessionWithoutHousehold><OnboardingPage /></RequireSessionWithoutHousehold>} />
      {/* 앱: 로그인 + 가구 연결 완료 */}
      <Route element={<RequireHousehold><AppLayout /></RequireHousehold>}>
        <Route index element={<Navigate to="/balance" replace />} />
        <Route path="/balance" element={<BalancePage />} />
        <Route path="/settle" element={<SettlePage />} />
        <Route path="/pnl" element={<PnlPage />} />
        <Route path="/cash" element={<CashPage />} />
        <Route path="/fire" element={<FirePage />} />
        <Route path="/fire/forecast" element={<ForecastPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/balance" replace />} />
    </Routes>
  )
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import 'pretendard/dist/web/static/pretendard.css'
import './styles/tokens.css'
import './styles/global.css'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { Splash } from './components/Splash'

/** 정적 미리보기 배포(`npm run build:preview`)에서는 서버 설정 없이 동작하도록 해시 라우터 사용 */
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <App />
        {/* 첫 진입 스플래시: 앱 위에 덮였다가 사라짐 */}
        <Splash />
      </AuthProvider>
    </Router>
  </StrictMode>,
)

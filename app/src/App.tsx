import { NavLink, Route, Routes } from 'react-router-dom'
import Overview from './pages/Overview'
import Ledger from './pages/Ledger'
import Accounts from './pages/Accounts'

export default function App() {
  return (
    <div className="shell">
      <nav className="nav">
        <div className="brand">MoneyGo</div>
        <NavLink to="/" end><span>📊</span>Tổng quan</NavLink>
        <NavLink to="/ledger"><span>🧾</span>Sổ giao dịch</NavLink>
        <NavLink to="/accounts"><span>👛</span>Tài khoản</NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/accounts" element={<Accounts />} />
        </Routes>
      </main>
    </div>
  )
}

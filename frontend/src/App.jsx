import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import DashboardPage from './pages/dashboard/DashboardPage'
import MapPage from './pages/map/MapPage'
import PredictionsPage from './pages/predictions/PredictionsPage'
import SimulatorPage from './pages/simulator/SimulatorPage'
import FleetPage from './pages/fleet/FleetPage'
import DriversPage from './pages/drivers/DriversPage'
import ReportsPage from './pages/reports/ReportsPage'
import DataPage from './pages/data/DataPage'
import PerformancePage from './pages/performance/PerformancePage'
import RoutesPage from './pages/routes/RoutesPage'
import CalendarPage from './pages/calendar/CalendarPage'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/predictions" element={<PredictionsPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/fleet" element={<FleetPage />} />
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="/performance" element={<PerformancePage />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

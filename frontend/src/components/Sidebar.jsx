import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/',            label: 'Dashboard',    icon: '📊' },
  { to: '/map',         label: 'Live Map',      icon: '🗺️' },
  { to: '/predictions', label: 'Predictions',   icon: '📈' },
  { to: '/simulator',   label: 'Simulator',     icon: '🧪' },
  { to: '/fleet',       label: 'Fleet',         icon: '🚛' },
  { to: '/drivers',     label: 'Drivers',       icon: '👷' },
  { to: '/reports',     label: 'Reports',       icon: '📋' },
  { to: '/data',        label: 'Data',          icon: '🗄️' },
  { to: '/performance', label: 'Performance',   icon: '🎯' },
  { to: '/routes',      label: 'Routes',        icon: '🗺️' },
  { to: '/calendar',   label: 'Calendar',      icon: '📅' },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: '#0f172a',
      color: '#e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
          ♻️ WasteIQ
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
          DLH DKI Jakarta
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 20px',
              textDecoration: 'none',
              color: isActive ? '#fff' : '#94a3b8',
              background: isActive ? '#1e40af' : 'transparent',
              borderLeft: isActive ? '3px solid #60a5fa' : '3px solid transparent',
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              transition: 'all 0.15s',
            })}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #1e293b', fontSize: 11, color: '#475569' }}>
        AI See You Team<br />President University · 2026
      </div>
    </aside>
  )
}

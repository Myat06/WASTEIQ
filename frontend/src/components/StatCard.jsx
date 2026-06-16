export default function StatCard({ label, value, unit, sub, color = '#1D9E75', icon }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: '20px 24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      borderLeft: `4px solid ${color}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minWidth: 160,
    }}>
      <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {icon && <span style={{ marginRight: 6 }}>{icon}</span>}{label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.1 }}>
        {value}
        {unit && <span style={{ fontSize: 14, fontWeight: 500, color: '#888', marginLeft: 4 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#999' }}>{sub}</div>}
    </div>
  )
}

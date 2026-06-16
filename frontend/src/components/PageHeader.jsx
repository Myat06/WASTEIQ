export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      marginBottom: 24, flexWrap: 'wrap', gap: 12,
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{title}</h1>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
    </div>
  )
}

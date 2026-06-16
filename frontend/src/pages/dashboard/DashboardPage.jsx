import { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { getSummary, getHeatmap } from '../../services/api'
import StatCard from '../../components/StatCard'
import RiskBadge from '../../components/RiskBadge'
import PageHeader from '../../components/PageHeader'
import { RISK_COLORS, WEATHER_ICONS } from '../../services/constants'

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [heatmap, setHeatmap] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([getSummary(), getHeatmap()]).then(([s, h]) => {
      setSummary(s.data)
      setHeatmap(h.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Loading dashboard...</div>
  if (!summary) return (
    <div style={{ padding: 40 }}>
      <div style={{ color: '#e24b4a', marginBottom: 12 }}>Failed to load. Is the backend running on port 8000?</div>
      <button onClick={load} style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 700 }}>Retry</button>
    </div>
  )

  const weather = summary.current_weather
  const riskCounts = { critical: 0, high: 0, medium: 0, low: 0 }
  heatmap.forEach(z => { riskCounts[z.risk_level] = (riskCounts[z.risk_level] || 0) + 1 })

  const barData = {
    labels: Object.keys(riskCounts).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
    datasets: [{
      label: 'Zones',
      data: Object.values(riskCounts),
      backgroundColor: Object.keys(riskCounts).map(k => RISK_COLORS[k]),
      borderRadius: 6,
    }],
  }

  const top5 = [...heatmap].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 }
    return order[a.risk_level] - order[b.risk_level]
  }).slice(0, 5)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <PageHeader
        title="Executive Dashboard"
        subtitle={`${summary.date} · Jakarta · ${WEATHER_ICONS[weather?.condition] || '☀️'} ${weather?.condition || ''}`}
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Waste Today" value={(summary.total_waste_today_kg / 1000).toFixed(1)} unit="tonnes" color="#1D9E75" icon="🗑️" />
        <StatCard label="High Risk Zones" value={summary.high_risk_zones} color="#E24B4A" icon="⚠️" sub="Need priority dispatch" />
        <StatCard label="Trucks Deployed" value={summary.trucks_deployed} color="#EF9F27" icon="🚛" />
        <StatCard label="Man-Hours Required" value={Math.round(summary.man_hours_today)} unit="hrs" color="#6366f1" icon="👷" />
        <StatCard label="CO₂ Saved" value={summary.co2_saved_kg} unit="kg" color="#0ea5e9" icon="🌿" sub="vs unoptimised routing" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Risk distribution chart */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Zone Risk Distribution</h3>
          <Bar data={barData} options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
          }} />
        </div>

        {/* Top at-risk zones */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Top At-Risk Zones</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ paddingBottom: 8, fontWeight: 600 }}>Zone</th>
                <th style={{ paddingBottom: 8, fontWeight: 600 }}>Municipality</th>
                <th style={{ paddingBottom: 8, fontWeight: 600 }}>Waste (kg)</th>
                <th style={{ paddingBottom: 8, fontWeight: 600 }}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {top5.map(z => (
                <tr key={z.zone_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 0', fontWeight: 600, color: '#0f172a' }}>{z.name}</td>
                  <td style={{ padding: '8px 0', color: '#64748b' }}>{z.municipality}</td>
                  <td style={{ padding: '8px 0', color: '#64748b' }}>{z.waste_kg.toFixed(0)}</td>
                  <td style={{ padding: '8px 0' }}><RiskBadge level={z.risk_level} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Recommendations */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>🤖 AI Recommendations</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {summary.ai_recommendations.map((rec, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: '#f8fafc', borderRadius: 8, padding: '10px 14px',
              borderLeft: '3px solid #1D9E75', fontSize: 13, color: '#334155',
            }}>
              <span style={{ marginTop: 1 }}>→</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

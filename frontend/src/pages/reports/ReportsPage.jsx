import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js'
import { getSummary, getPredictions, getZones } from '../../services/api'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

export default function ReportsPage() {
  const [summary, setSummary] = useState(null)
  const [zones, setZones] = useState([])
  const [trend, setTrend] = useState([])

  useEffect(() => {
    getSummary().then(r => setSummary(r.data))
    getZones().then(r => setZones(r.data))
    // Build a 7-day synthetic trend from today's predictions
    getPredictions({ date: new Date().toISOString().slice(0, 10) }).then(r => {
      // Aggregate by hour
      const byHour = {}
      r.data.forEach(p => { byHour[p.prediction_hour] = (byHour[p.prediction_hour] || 0) + p.total_waste_kg })
      setTrend(Object.entries(byHour).sort((a, b) => a[0] - b[0]))
    })
  }, [])

  const trendChart = {
    labels: trend.map(([h]) => `${h}:00`),
    datasets: [{
      label: 'Total Waste (kg) — All Zones',
      data: trend.map(([, v]) => v),
      borderColor: '#1D9E75',
      backgroundColor: 'rgba(29,158,117,0.1)',
      fill: true,
      tension: 0.4,
    }],
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      <PageHeader title="Reports" subtitle="Daily waste summary and trends" />

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard label="Total Waste Today" value={(summary.total_waste_today_kg / 1000).toFixed(1)} unit="t" color="#1D9E75" />
          <StatCard label="High Risk Zones" value={summary.high_risk_zones} color="#E24B4A" />
          <StatCard label="Trucks Deployed" value={summary.trucks_deployed} color="#EF9F27" />
          <StatCard label="Man-Hours" value={Math.round(summary.man_hours_today)} unit="hrs" color="#6366f1" />
          <StatCard label="CO₂ Saved" value={summary.co2_saved_kg} unit="kg" color="#0ea5e9" />
        </div>
      )}

      {/* Hourly trend chart */}
      {trend.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Today's Waste Volume — All 30 Zones (Hourly)</h3>
          <Line data={trendChart} options={{
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Total Waste (kg)' } } },
          }} />
        </div>
      )}

      {/* Zone summary table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Zone Baseline Summary</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Zone', 'Municipality', 'Land Use', 'Population', 'Baseline (kg/day)', 'Area (km²)'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zones.map(z => (
              <tr key={z.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 16px', fontWeight: 600 }}>{z.name}</td>
                <td style={{ padding: '8px 16px', color: '#64748b' }}>{z.municipality}</td>
                <td style={{ padding: '8px 16px', color: '#64748b' }}>{z.land_use}</td>
                <td style={{ padding: '8px 16px', color: '#64748b' }}>{z.population.toLocaleString()}</td>
                <td style={{ padding: '8px 16px', fontWeight: 600, color: '#0f172a' }}>{z.baseline_waste_kg_per_day.toLocaleString()}</td>
                <td style={{ padding: '8px 16px', color: '#64748b' }}>{z.area_sqkm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

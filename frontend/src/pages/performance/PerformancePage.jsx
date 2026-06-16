import { useEffect, useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { getModelPerformance } from '../../services/api'
import PageHeader from '../../components/PageHeader'

Chart.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

export default function PerformancePage() {
  const [perf, setPerf] = useState(null)

  useEffect(() => { getModelPerformance().then(r => setPerf(r.data)) }, [])

  if (!perf) return <div style={{ padding: 40, color: '#64748b' }}>Loading performance data...</div>

  const mapeColor = perf.mape < 8 ? '#1D9E75' : perf.mape < 10 ? '#EF9F27' : '#E24B4A'
  const mapeGauge = {
    labels: ['MAPE', 'Remaining'],
    datasets: [{ data: [perf.mape, Math.max(0, 15 - perf.mape)], backgroundColor: [mapeColor, '#e2e8f0'], borderWidth: 0 }],
  }

  const zoneBar = {
    labels: perf.accuracy_by_zone.map(z => z.zone),
    datasets: [{
      label: 'MAPE (%)',
      data: perf.accuracy_by_zone.map(z => z.mape),
      backgroundColor: perf.accuracy_by_zone.map(z => z.mape < 8 ? '#1D9E75' : z.mape < 10 ? '#EF9F27' : '#E24B4A'),
      borderRadius: 4,
    }],
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      <PageHeader title="Model Performance" subtitle="Prediction accuracy metrics and retraining schedule" />

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'MAPE', value: `${perf.mape}%`, sub: `Target: <${perf.target_mape}%`, color: mapeColor },
          { label: 'MAE', value: `${perf.mae} kg`, sub: 'Mean absolute error', color: '#6366f1' },
          { label: 'Total Predictions', value: perf.total_predictions, color: '#1D9E75' },
          { label: 'Last Retrained', value: perf.last_retrained, color: '#EF9F27' },
          { label: 'Next Retraining', value: perf.next_retraining, color: '#0ea5e9' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}` }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, marginBottom: 20 }}>
        {/* MAPE Gauge */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>MAPE Gauge</h3>
          <div style={{ width: 160, margin: '0 auto' }}>
            <Doughnut data={mapeGauge} options={{
              cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false } },
            }} />
          </div>
          <div style={{ marginTop: 12, fontSize: 28, fontWeight: 900, color: mapeColor }}>{perf.mape}%</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Target: &lt;{perf.target_mape}%</div>
          <div style={{ marginTop: 8, fontSize: 12, background: '#f8fafc', borderRadius: 6, padding: '6px 10px', color: '#64748b' }}>
            {perf.model_version}
          </div>
        </div>

        {/* Zone accuracy chart */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>MAPE by Zone</h3>
          <Bar data={zoneBar} options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, title: { display: true, text: 'MAPE (%)' }, max: 15 },
              x: { ticks: { font: { size: 11 } } },
            },
          }} />
        </div>
      </div>

      {/* Zone accuracy table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 14 }}>Zone Accuracy Detail</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Zone', 'MAPE (%)', 'Total Predictions', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {perf.accuracy_by_zone.map((z, i) => (
              <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 16px', fontWeight: 600 }}>{z.zone}</td>
                <td style={{ padding: '8px 16px', fontWeight: 700, color: z.mape < 8 ? '#1D9E75' : z.mape < 10 ? '#EF9F27' : '#E24B4A' }}>{z.mape}%</td>
                <td style={{ padding: '8px 16px', color: '#64748b' }}>{z.predictions}</td>
                <td style={{ padding: '8px 16px' }}>
                  <span style={{ background: z.mape < 10 ? '#EAF5EE' : '#FCEBEB', color: z.mape < 10 ? '#1D9E75' : '#E24B4A', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                    {z.mape < 10 ? 'ON TARGET' : 'ABOVE TARGET'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

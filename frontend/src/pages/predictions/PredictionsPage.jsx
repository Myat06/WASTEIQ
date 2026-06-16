import { useEffect, useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { getPredictions, getZones } from '../../services/api'
import PageHeader from '../../components/PageHeader'
import RiskBadge from '../../components/RiskBadge'
import { RISK_COLORS } from '../../services/constants'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler)

export default function PredictionsPage() {
  const [zones, setZones] = useState([])
  const [selectedZone, setSelectedZone] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getZones().then(r => {
      setZones(r.data)
      if (r.data.length) setSelectedZone(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedZone) return
    setLoading(true)
    getPredictions({ zone: selectedZone, date: selectedDate }).then(r => {
      setPredictions(r.data)
      setLoading(false)
    })
  }, [selectedZone, selectedDate])

  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)
  const byHour = hours.map((_, h) => predictions.find(p => p.prediction_hour === h))

  const lineData = {
    labels: hours,
    datasets: [
      {
        label: 'Total Waste (kg)',
        data: byHour.map(p => p?.total_waste_kg || null),
        borderColor: '#1D9E75',
        backgroundColor: 'rgba(29,158,117,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      },
      {
        label: 'Event Waste (kg)',
        data: byHour.map(p => p?.event_waste_kg || null),
        borderColor: '#EF9F27',
        backgroundColor: 'rgba(239,159,39,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      },
    ],
  }

  const confidenceData = {
    labels: hours,
    datasets: [
      {
        label: 'Upper Bound',
        data: byHour.map(p => p?.confidence_upper || null),
        borderColor: 'rgba(99,102,241,0.4)',
        backgroundColor: 'rgba(99,102,241,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'Lower Bound',
        data: byHour.map(p => p?.confidence_lower || null),
        borderColor: 'rgba(99,102,241,0.4)',
        backgroundColor: 'rgba(255,255,255,1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  }

  const zoneName = zones.find(z => z.id === Number(selectedZone))?.name || ''

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      <PageHeader title="Predictions" subtitle="24-hour waste forecast by zone" />

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minWidth: 180 }}>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name} ({z.municipality})</option>)}
        </select>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }} />
      </div>

      {loading && <div style={{ color: '#64748b' }}>Loading predictions...</div>}

      {!loading && predictions.length > 0 && (
        <>
          {/* 24h Line Chart */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>24-Hour Waste Forecast — {zoneName}</h3>
            <Line data={lineData} options={{
              responsive: true,
              interaction: { mode: 'index', intersect: false },
              plugins: { legend: { position: 'bottom' } },
              scales: { y: { beginAtZero: true, title: { display: true, text: 'Waste (kg)' } } },
            }} />
          </div>

          {/* Confidence interval */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Confidence Interval (±15%)</h3>
            <Line data={confidenceData} options={{
              responsive: true,
              plugins: { legend: { position: 'bottom' } },
              scales: { y: { beginAtZero: true } },
            }} />
          </div>

          {/* Man-hour table */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Man-Hour Requirements by Hour</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Hour', 'Risk', 'Waste (kg)', 'Workers', 'Man-Hours', 'Trucks', 'Temp Bins'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byHour.filter(Boolean).map((p, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{p.prediction_hour}:00</td>
                      <td style={{ padding: '8px 12px' }}><RiskBadge level={p.risk_level} /></td>
                      <td style={{ padding: '8px 12px' }}>{p.total_waste_kg.toFixed(0)}</td>
                      <td style={{ padding: '8px 12px' }}>{p.workers_needed}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#6366f1' }}>{p.man_hours_required}</td>
                      <td style={{ padding: '8px 12px' }}>{p.trucks_needed}</td>
                      <td style={{ padding: '8px 12px' }}>{p.temp_bins_needed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && predictions.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#94a3b8' }}>
          No predictions for this zone/date. Try generating one from the Simulator.
        </div>
      )}
    </div>
  )
}

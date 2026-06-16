import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { getZones, runSimulator } from '../../services/api'
import PageHeader from '../../components/PageHeader'
import RiskBadge from '../../components/RiskBadge'
import { RISK_COLORS, EVENT_TYPE_LABELS, WEATHER_ICONS } from '../../services/constants'

export default function SimulatorPage() {
  const [zones, setZones] = useState([])
  const [form, setForm] = useState({
    zone_id: '',
    event_type: 'food_festival',
    expected_attendees: 15000,
    duration_hours: 8,
    weather: 'sunny',
    day_type: 'weekend',
    event_date: new Date().toISOString().slice(0, 10),
    permit_number: `EVT-${new Date().getFullYear()}-SIM`,
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getZones().then(r => {
      setZones(r.data)
      if (r.data.length) setForm(f => ({ ...f, zone_id: r.data[0].id }))
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const r = await runSimulator({ ...form, zone_id: Number(form.zone_id) })
      setResult(r.data)
    } catch {
      setError('Simulation failed. Check that the backend is running.')
    }
    setLoading(false)
  }

  const inputStyle = {
    padding: '8px 12px', borderRadius: 8,
    border: '1px solid #cbd5e1', fontSize: 13, width: '100%', boxSizing: 'border-box',
  }
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      <PageHeader title="Scenario Simulator" subtitle="What-if waste prediction for crowd permit events" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, alignItems: 'start' }}>
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Crowd Permit Number</label>
            <input style={inputStyle} value={form.permit_number} onChange={e => setForm(f => ({ ...f, permit_number: e.target.value }))} required />
          </div>
          <div>
            <label style={labelStyle}>Zone</label>
            <select style={inputStyle} value={form.zone_id} onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name} ({z.municipality})</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Event Type</label>
            <select style={inputStyle} value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
              {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Expected Attendees</label>
              <input style={inputStyle} type="number" min="100" value={form.expected_attendees} onChange={e => setForm(f => ({ ...f, expected_attendees: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={labelStyle}>Duration (hours)</label>
              <input style={inputStyle} type="number" min="1" max="24" value={form.duration_hours} onChange={e => setForm(f => ({ ...f, duration_hours: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Weather</label>
              <select style={inputStyle} value={form.weather} onChange={e => setForm(f => ({ ...f, weather: e.target.value }))}>
                {Object.entries(WEATHER_ICONS).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Day Type</label>
              <select style={inputStyle} value={form.day_type} onChange={e => setForm(f => ({ ...f, day_type: e.target.value }))}>
                <option value="weekday">Weekday</option>
                <option value="weekend">Weekend</option>
                <option value="holiday">Public Holiday</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Event Date</label>
            <input style={inputStyle} type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
          </div>
          <button type="submit" disabled={loading} style={{
            background: loading ? '#94a3b8' : '#1D9E75', color: '#fff',
            border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 14,
            fontWeight: 700, cursor: loading ? 'default' : 'pointer', marginTop: 4,
          }}>
            {loading ? 'Running simulation...' : '▶ Run Simulation'}
          </button>
          {error && <div style={{ color: '#E24B4A', fontSize: 13 }}>{error}</div>}
        </form>

        {/* Results */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Summary */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Results — {result.zone.name}</h3>
                <RiskBadge level={result.prediction.risk_level} size="lg" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Total Waste', value: `${result.prediction.total_waste_kg.toFixed(0)} kg`, color: RISK_COLORS[result.prediction.risk_level] },
                  { label: 'Event Waste', value: `${result.prediction.event_waste_kg.toFixed(0)} kg`, color: '#EF9F27' },
                  { label: 'Baseline', value: `${result.prediction.baseline_waste_kg.toFixed(0)} kg`, color: '#64748b' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign: 'center', background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                Confidence: {result.prediction.confidence_interval.lower.toFixed(0)} – {result.prediction.confidence_interval.upper.toFixed(0)} kg (±15%)
              </div>
            </div>

            {/* Resources */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Resources Needed</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { icon: '👷', label: 'Workers', value: result.resources_needed.workers_needed },
                  { icon: '⏱️', label: 'Man-Hours', value: result.resources_needed.man_hours_required },
                  { icon: '🚛', label: 'Trucks', value: result.resources_needed.trucks_needed },
                  { icon: '🗑️', label: 'Temp Bins', value: result.resources_needed.temp_bins_needed },
                  { icon: '🏗️', label: 'TPS Units', value: result.resources_needed.temp_tps_units_needed },
                  { icon: '🚚', label: 'Truck Types', value: result.resources_needed.truck_types.join(', ') },
                ].map(({ icon, label, value }) => (
                  <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{icon} {label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini map */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Crowd Location Map</h3>
              <div style={{ height: 200, borderRadius: 8, overflow: 'hidden' }}>
                <MapContainer center={[result.zone.lat, result.zone.lng]} zoom={14} style={{ height: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <CircleMarker
                    center={[result.crowd_location.latitude, result.crowd_location.longitude]}
                    radius={28}
                    fillColor={RISK_COLORS[result.prediction.risk_level]}
                    color={RISK_COLORS[result.prediction.risk_level]}
                    weight={3}
                    fillOpacity={0.4}
                  >
                    <Popup>{result.zone.name}<br />Crowd radius: ~{result.crowd_location.radius_m}m</Popup>
                  </CircleMarker>
                </MapContainer>
              </div>
            </div>

            {/* Recommendations */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>🤖 Recommendations</h3>
              {result.recommendations.map((r, i) => (
                <div key={i} style={{
                  background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 8,
                  borderLeft: '3px solid #1D9E75', fontSize: 13, color: '#334155',
                }}>→ {r}</div>
              ))}
            </div>
          </div>
        )}

        {!result && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#94a3b8', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 40 }}>🧪</span>
            <span>Fill in the form and click Run Simulation</span>
          </div>
        )}
      </div>
    </div>
  )
}

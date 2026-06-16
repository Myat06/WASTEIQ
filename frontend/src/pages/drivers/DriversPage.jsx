import { useEffect, useState } from 'react'
import { getDrivers, submitReport, getZones, getDriverReports } from '../../services/api'
import PageHeader from '../../components/PageHeader'

const REPORT_TYPES = ['bin_full', 'illegal_dump', 'collection_done', 'road_blocked', 'other']
const REPORT_ICONS = { bin_full: '🗑️', illegal_dump: '⛔', collection_done: '✅', road_blocked: '🚧', other: '📝' }
const TYPE_LABELS = {
  bin_full: 'Bin Full', illegal_dump: 'Illegal Dumping', collection_done: 'Collection Done',
  road_blocked: 'Road Blocked', overflow: 'TPS Overflow', blocked: 'Road Blocked',
  extra_waste: 'Extra Waste', completed: 'Route Completed', vehicle_issue: 'Vehicle Issue', other: 'Other',
}
const TYPE_COLORS = {
  completed: '#1D9E75', collection_done: '#1D9E75',
  overflow: '#EF9F27', bin_full: '#EF9F27', extra_waste: '#F59E0B',
  road_blocked: '#E24B4A', blocked: '#E24B4A', illegal_dump: '#E24B4A',
  vehicle_issue: '#64748B', other: '#64748B',
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState([])
  const [zones, setZones] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ driver: '', zone: '', report_type: 'bin_full', description: '' })
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [expandedDriver, setExpandedDriver] = useState(null)
  const [driverReports, setDriverReports] = useState({})
  const [loadingReports, setLoadingReports] = useState(null)

  useEffect(() => {
    getDrivers().then(r => setDrivers(r.data))
    getZones().then(r => setZones(r.data))
  }, [])

  const handleReport = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await submitReport(form.driver, { zone: form.zone, report_type: form.report_type, description: form.description })
      setMsg('Report submitted successfully')
      setShowForm(false)
      setForm({ driver: '', zone: '', report_type: 'bin_full', description: '' })
      // Refresh reports if this driver is expanded
      if (expandedDriver === parseInt(form.driver)) {
        loadReports(parseInt(form.driver))
      }
    } catch { setMsg('Failed to submit report') }
    setSubmitting(false)
  }

  const toggleHistory = async (driverId) => {
    if (expandedDriver === driverId) { setExpandedDriver(null); return }
    setExpandedDriver(driverId)
    if (!driverReports[driverId]) loadReports(driverId)
  }

  const loadReports = async (driverId) => {
    setLoadingReports(driverId)
    try {
      const res = await getDriverReports(driverId)
      setDriverReports(prev => ({ ...prev, [driverId]: res.data }))
    } catch { setDriverReports(prev => ({ ...prev, [driverId]: [] })) }
    setLoadingReports(null)
  }

  const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, width: '100%', boxSizing: 'border-box' }
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000 }}>
      <PageHeader
        title="Driver Operations"
        subtitle="Driver assignments, field reports and history"
        actions={
          <button onClick={() => setShowForm(!showForm)} style={{
            background: '#1D9E75', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            + Submit Field Report
          </button>
        }
      />

      {msg && (
        <div style={{ background: '#EAF5EE', color: '#1D9E75', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13 }}>
          {msg}
        </div>
      )}

      {/* Report form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Field Report</h3>
          <form onSubmit={handleReport} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Driver</label>
              <select style={inputStyle} value={form.driver} onChange={e => setForm(f => ({ ...f, driver: e.target.value }))} required>
                <option value="">Select driver</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.employee_id})</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Zone</label>
              <select style={inputStyle} value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} required>
                <option value="">Select zone</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Report Type</label>
              <select style={inputStyle} value={form.report_type} onChange={e => setForm(f => ({ ...f, report_type: e.target.value }))}>
                {REPORT_TYPES.map(t => <option key={t} value={t}>{REPORT_ICONS[t]} {t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional details..." />
            </div>
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10 }}>
              <button type="submit" disabled={submitting} style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Driver table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Driver', 'Employee ID', 'Phone', 'Vehicle', 'Zone', 'On Duty', ''].map((h, i) => (
                <th key={i} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drivers.map(d => (
              <>
                <tr key={d.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 600 }}>{d.name}</td>
                  <td style={{ padding: '10px 16px', color: '#64748b', fontFamily: 'monospace' }}>{d.employee_id}</td>
                  <td style={{ padding: '10px 16px', color: '#64748b' }}>{d.phone}</td>
                  <td style={{ padding: '10px 16px', color: '#64748b' }}>{d.vehicle_id || '—'}</td>
                  <td style={{ padding: '10px 16px', color: '#64748b' }}>{d.zone_name || '—'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      background: d.is_on_duty ? '#EAF5EE' : '#f1f5f9',
                      color: d.is_on_duty ? '#1D9E75' : '#94a3b8',
                      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                    }}>
                      {d.is_on_duty ? 'ON DUTY' : 'OFF'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <button
                      onClick={() => toggleHistory(d.id)}
                      style={{
                        background: 'none', border: '1px solid #e2e8f0', borderRadius: 6,
                        padding: '4px 10px', fontSize: 11, color: '#64748b', cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {expandedDriver === d.id ? '▲ Hide' : '▼ History'}
                    </button>
                  </td>
                </tr>
                {expandedDriver === d.id && (
                  <tr key={`hist-${d.id}`}>
                    <td colSpan={7} style={{ padding: 0, background: '#f8fafc' }}>
                      <DriverHistory
                        reports={driverReports[d.id]}
                        loading={loadingReports === d.id}
                        driverName={d.name}
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DriverHistory({ reports, loading, driverName }) {
  if (loading) return (
    <div style={{ padding: '16px 24px', color: '#94a3b8', fontSize: 13 }}>Loading reports…</div>
  )
  if (!reports) return null
  if (reports.length === 0) return (
    <div style={{ padding: '16px 24px', color: '#94a3b8', fontSize: 13 }}>No reports filed by {driverName} yet.</div>
  )
  return (
    <div style={{ padding: '12px 24px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, marginBottom: 10 }}>
        FIELD REPORTS — {driverName} ({reports.length} total)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {reports.slice(0, 10).map(r => {
          const color = TYPE_COLORS[r.report_type] ?? '#64748b'
          return (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: '#fff', borderRadius: 8, padding: '10px 14px',
              border: '1px solid #e2e8f0',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: color, marginTop: 5, flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color }}>
                    {TYPE_LABELS[r.report_type] ?? r.report_type}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>{timeAgo(r.reported_at)}</span>
                </div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{r.zone_name}</div>
                {r.description && (
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{r.description}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

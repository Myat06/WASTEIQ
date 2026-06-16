import { useEffect, useState } from 'react'
import { getFleet, dispatchFleet, getZones } from '../../services/api'
import PageHeader from '../../components/PageHeader'

const STATUS_COLORS = { active: '#1D9E75', idle: '#94a3b8', deployed: '#1e40af', maintenance: '#E24B4A' }
const STATUS_BG = { active: '#EAF5EE', idle: '#f1f5f9', deployed: '#eff6ff', maintenance: '#FCEBEB' }
const TYPE_ICONS = { compactor: '🚛', organic_hauler: '🚚', recycling_unit: '♻️', tipper: '🏗️' }

function StatusBadge({ status }) {
  return (
    <span style={{
      background: STATUS_BG[status], color: STATUS_COLORS[status],
      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    }}>{status}</span>
  )
}

function CapacityBar({ pct }) {
  const color = pct > 80 ? '#E24B4A' : pct > 50 ? '#EF9F27' : '#1D9E75'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 12, color: '#64748b', minWidth: 28 }}>{pct}%</span>
    </div>
  )
}

export default function FleetPage() {
  const [vehicles, setVehicles] = useState([])
  const [zones, setZones] = useState([])
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterType, setFilterType] = useState('All')
  const [dispatchZone, setDispatchZone] = useState('')
  const [dispatching, setDispatching] = useState(false)
  const [dispatchMsg, setDispatchMsg] = useState('')

  const load = () => getFleet().then(r => setVehicles(r.data))

  useEffect(() => {
    load()
    getZones().then(r => { setZones(r.data); if (r.data.length) setDispatchZone(r.data[0].id) })
    const iv = setInterval(load, 4000)
    return () => clearInterval(iv)
  }, [])

  const filtered = vehicles.filter(v =>
    (filterStatus === 'All' || v.status === filterStatus) &&
    (filterType === 'All' || v.vehicle_type === filterType)
  )

  const statusCounts = vehicles.reduce((acc, v) => { acc[v.status] = (acc[v.status] || 0) + 1; return acc }, {})

  const handleDispatch = async () => {
    if (!dispatchZone) return
    setDispatching(true)
    try {
      const r = await dispatchFleet({ zone_id: Number(dispatchZone) })
      setDispatchMsg(`Dispatched ${r.data.recommended_vehicles.length} vehicle(s) to ${r.data.zone}. ETA: ${r.data.estimated_arrival}`)
      load()
    } catch { setDispatchMsg('Dispatch failed.') }
    setDispatching(false)
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      <PageHeader title="Fleet Management" subtitle="Live vehicle tracking and dispatch" />

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.entries(statusCounts).map(([s, n]) => (
          <div key={s} style={{
            background: STATUS_BG[s], border: `1px solid ${STATUS_COLORS[s]}22`,
            borderRadius: 10, padding: '12px 20px', minWidth: 100,
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: STATUS_COLORS[s] }}>{n}</div>
            <div style={{ fontSize: 12, color: STATUS_COLORS[s], fontWeight: 600, textTransform: 'uppercase' }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Dispatch panel */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 14 }}>🚨 Dispatch Trucks</strong>
        <select value={dispatchZone} onChange={e => setDispatchZone(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <button onClick={handleDispatch} disabled={dispatching} style={{
          background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8,
          padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          {dispatching ? 'Dispatching...' : 'Dispatch Nearest Idle'}
        </button>
        {dispatchMsg && <span style={{ fontSize: 13, color: '#1D9E75' }}>{dispatchMsg}</span>}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}>
          {['All', 'active', 'idle', 'deployed', 'maintenance'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}>
          {['All', 'compactor', 'organic_hauler', 'recycling_unit', 'tipper'].map(t => <option key={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center' }}>Auto-refreshes every 4s · GPS simulated</span>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Vehicle', 'Type', 'Status', 'Capacity', 'Zone', 'Driver', 'Last Updated'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 16px', fontWeight: 700 }}>{v.vehicle_id}</td>
                <td style={{ padding: '10px 16px' }}>{TYPE_ICONS[v.vehicle_type]} {v.vehicle_type.replace('_', ' ')}</td>
                <td style={{ padding: '10px 16px' }}><StatusBadge status={v.status} /></td>
                <td style={{ padding: '10px 16px', minWidth: 130 }}><CapacityBar pct={v.capacity_pct} /></td>
                <td style={{ padding: '10px 16px', color: '#64748b' }}>{v.zone_name || '—'}</td>
                <td style={{ padding: '10px 16px', color: '#64748b' }}>{v.driver_name || '—'}</td>
                <td style={{ padding: '10px 16px', color: '#94a3b8', fontSize: 12 }}>
                  {new Date(v.last_updated).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

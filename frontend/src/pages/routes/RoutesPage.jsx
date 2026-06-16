import { useEffect, useState } from 'react'
import { getRoutes, getDrivers, requestRoute, completeRoute } from '../../services/api'
import PageHeader from '../../components/PageHeader'
import RiskBadge from '../../components/RiskBadge'

const RISK_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

// Jakarta center coordinates (used when driver lat/lng unknown)
const JAKARTA_LAT = -6.2088
const JAKARTA_LNG = 106.8456

export default function RoutesPage() {
  const [routes, setRoutes] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [dispatching, setDispatching] = useState(false)
  const [completing, setCompleting] = useState(null)
  const [selectedDriver, setSelectedDriver] = useState('')
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [routeRes, driverRes] = await Promise.all([getRoutes(), getDrivers()])
      setRoutes(routeRes.data)
      setDrivers(driverRes.data)
    } catch {
      setError('Failed to load routes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRequestRoute = async () => {
    if (!selectedDriver) return
    setDispatching(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const driver = drivers.find(d => d.id === parseInt(selectedDriver))
      await requestRoute({
        driver_id: selectedDriver,
        vehicle_lat: driver?.vehicle_lat ?? JAKARTA_LAT,
        vehicle_lng: driver?.vehicle_lng ?? JAKARTA_LNG,
        zone_count: 3,
      })
      setSuccessMsg(`Optimized route assigned to ${driver?.name}`)
      setSelectedDriver('')
      load()
    } catch (e) {
      setError(e.response?.data?.error ?? 'Failed to assign route')
    } finally {
      setDispatching(false)
    }
  }

  const handleComplete = async (routeId) => {
    setCompleting(routeId)
    try {
      await completeRoute(routeId)
      load()
    } finally {
      setCompleting(null)
    }
  }

  const activeRoutes = routes.filter(r => r.status === 'active')
  const completedRoutes = routes.filter(r => r.status === 'completed')

  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <PageHeader
        title="Route Optimization"
        subtitle={`${activeRoutes.length} active routes · ${completedRoutes.length} completed today`}
      />

      {/* Assign Route Panel */}
      <div style={{
        background: '#1E293B', borderRadius: 14, padding: 24,
        border: '1px solid #334155', marginBottom: 28,
      }}>
        <div style={{ color: '#94A3B8', fontSize: 12, fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>
          ASSIGN OPTIMIZED ROUTE
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Select Driver</div>
            <select
              value={selectedDriver}
              onChange={e => setSelectedDriver(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: '#0F172A', border: '1px solid #334155',
                color: '#fff', fontSize: 14,
              }}
            >
              <option value="">— choose driver —</option>
              {drivers
                .filter(d => !activeRoutes.some(r => r.driver_id === d.id))
                .map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.employee_id}) · {d.assigned_zone_name ?? 'No zone'}
                  </option>
                ))}
            </select>
          </div>
          <button
            onClick={handleRequestRoute}
            disabled={!selectedDriver || dispatching}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: selectedDriver ? '#1D9E75' : '#334155',
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: selectedDriver ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {dispatching ? '⏳ Optimizing…' : '⚡ Auto-Assign Route'}
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: '#475569' }}>
          Algorithm picks top 3 zones by risk, then optimizes visit order by distance (nearest-neighbor)
        </div>
        {successMsg && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#0F2D25', borderRadius: 8, color: '#1D9E75', fontSize: 13 }}>
            ✅ {successMsg}
          </div>
        )}
        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#2D1515', borderRadius: 8, color: '#E24B4A', fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Active Routes */}
      <div style={{ marginBottom: 10, color: '#94A3B8', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
        ACTIVE ROUTES ({activeRoutes.length})
      </div>
      {loading ? (
        <div style={{ color: '#475569', padding: 32, textAlign: 'center' }}>Loading routes…</div>
      ) : activeRoutes.length === 0 ? (
        <div style={{ color: '#475569', padding: 32, textAlign: 'center', background: '#1E293B', borderRadius: 12 }}>
          No active routes. Assign one above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
          {activeRoutes.map(route => (
            <RouteCard
              key={route.id}
              route={route}
              onComplete={() => handleComplete(route.id)}
              completing={completing === route.id}
            />
          ))}
        </div>
      )}

      {/* Completed Routes */}
      {completedRoutes.length > 0 && (
        <>
          <div style={{ marginBottom: 10, color: '#94A3B8', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
            COMPLETED ({completedRoutes.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {completedRoutes.slice(0, 10).map(route => (
              <RouteCard key={route.id} route={route} completed />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function RouteCard({ route, onComplete, completing, completed }) {
  const stops = route.stops ?? []

  return (
    <div style={{
      background: '#1E293B', borderRadius: 12,
      border: `1px solid ${completed ? '#1E293B' : '#334155'}`,
      opacity: completed ? 0.7 : 1,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: completed ? 'none' : '1px solid #0F172A',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: completed ? '#0F2D25' : '#0F172A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>
            {completed ? '✅' : '🚛'}
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
              {route.driver_name ?? `Driver #${route.driver_id}`}
            </div>
            <div style={{ color: '#64748B', fontSize: 12 }}>
              {route.vehicle_id ?? 'No vehicle'} · {stops.length} stops
              {route.distance_km ? ` · ~${route.distance_km} km` : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: completed ? '#0F2D25' : '#1a2d1a',
            color: completed ? '#1D9E75' : '#4ADE80',
          }}>
            {completed ? 'COMPLETED' : 'ACTIVE'}
          </span>
          {!completed && (
            <button
              onClick={onComplete}
              disabled={completing}
              style={{
                padding: '6px 16px', borderRadius: 8, border: 'none',
                background: '#1D9E75', color: '#fff', fontWeight: 600,
                fontSize: 12, cursor: 'pointer',
              }}
            >
              {completing ? 'Completing…' : 'Mark Complete'}
            </button>
          )}
        </div>
      </div>

      {/* Stops */}
      {stops.length > 0 && (
        <div style={{ padding: '12px 18px', display: 'flex', gap: 0, flexDirection: 'column' }}>
          {stops.map((stop, i) => (
            <div key={stop.id} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: i < stops.length - 1 ? 10 : 0 }}>
              {/* connector line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: stop.completed_at ? '#1D9E75' : '#334155',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {stop.completed_at ? '✓' : i + 1}
                </div>
                {i < stops.length - 1 && (
                  <div style={{ width: 2, height: 20, background: '#334155', marginTop: 2 }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: stop.completed_at ? '#64748B' : '#fff', fontWeight: 600, fontSize: 14 }}>
                    {stop.zone_name}
                  </span>
                  {stop.risk_level && <RiskBadge level={stop.risk_level} />}
                </div>
                <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>
                  {stop.total_waste_kg ? `~${Math.round(stop.total_waste_kg)} kg predicted` : ''}
                  {stop.completed_at ? ` · completed ${new Date(stop.completed_at).toLocaleTimeString()}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

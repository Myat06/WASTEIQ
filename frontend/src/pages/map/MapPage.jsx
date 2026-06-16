import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { getHeatmap, getFleet, getEvents } from '../../services/api'
import { RISK_COLORS } from '../../services/constants'
import RiskBadge from '../../components/RiskBadge'

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const truckIcon = L.divIcon({
  html: '<div style="font-size:18px;line-height:1">🚛</div>',
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

export default function MapPage() {
  const [heatmap, setHeatmap] = useState([])
  const [fleet, setFleet] = useState([])
  const [events, setEvents] = useState([])
  const [filterMunicipality, setFilterMunicipality] = useState('All')
  const [filterRisk, setFilterRisk] = useState('All')

  useEffect(() => {
    const load = () => {
      getHeatmap().then(r => setHeatmap(r.data))
      getFleet().then(r => setFleet(r.data))
      getEvents().then(r => setEvents(r.data))
    }
    load()
    const iv = setInterval(load, 5000) // refresh every 5s for live GPS
    return () => clearInterval(iv)
  }, [])

  const municipalities = ['All', ...new Set(heatmap.map(z => z.municipality))]
  const filtered = heatmap.filter(z =>
    (filterMunicipality === 'All' || z.municipality === filterMunicipality) &&
    (filterRisk === 'All' || z.risk_level === filterRisk)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px',
        background: '#fff', borderBottom: '1px solid #e2e8f0', flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>🗺️ Live Map</span>
        <select value={filterMunicipality} onChange={e => setFilterMunicipality(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}>
          {municipalities.map(m => <option key={m}>{m}</option>)}
        </select>
        <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}>
          {['All', 'critical', 'high', 'medium', 'low'].map(r => <option key={r}>{r}</option>)}
        </select>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, marginLeft: 'auto', fontSize: 12 }}>
          {Object.entries(RISK_COLORS).map(([k, c]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
              {k}
            </span>
          ))}
          <span>🚛 Fleet</span>
          <span>📍 Event</span>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1 }}>
        <MapContainer center={[-6.2, 106.82]} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />

          {/* Zone circles */}
          {filtered.map(z => (
            <CircleMarker
              key={z.zone_id}
              center={[z.lat, z.lng]}
              radius={18}
              fillColor={RISK_COLORS[z.risk_level]}
              color={RISK_COLORS[z.risk_level]}
              weight={2}
              fillOpacity={0.55}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <strong style={{ fontSize: 14 }}>{z.name}</strong><br />
                  <span style={{ color: '#64748b', fontSize: 12 }}>{z.municipality} Jakarta</span><br /><br />
                  <span>Waste: <strong>{z.waste_kg.toFixed(0)} kg</strong></span><br />
                  <span>Risk: <strong style={{ color: RISK_COLORS[z.risk_level] }}>{z.risk_level.toUpperCase()}</strong></span>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Fleet vehicles */}
          {fleet.filter(v => v.current_latitude && v.status !== 'maintenance').map(v => (
            <Marker key={v.id} position={[v.current_latitude, v.current_longitude]} icon={truckIcon}>
              <Popup>
                <strong>{v.vehicle_id}</strong><br />
                {v.vehicle_type} · {v.status}<br />
                Capacity: {v.capacity_pct}%<br />
                Zone: {v.zone_name || '—'}
              </Popup>
            </Marker>
          ))}

          {/* Event pins */}
          {events.slice(0, 10).map(ev => (
            <CircleMarker
              key={ev.id}
              center={[ev.zone_lat, ev.zone_lng]}
              radius={10}
              fillColor="#6366f1"
              color="#6366f1"
              weight={3}
              fillOpacity={0.8}
            >
              <Popup>
                <strong>{ev.event_name}</strong><br />
                <span style={{ fontSize: 12, color: '#64748b' }}>{ev.event_type.replace('_', ' ')}</span><br /><br />
                Date: {ev.event_date}<br />
                Attendees: {ev.expected_attendees.toLocaleString()}<br />
                Zone: {ev.zone_name}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}

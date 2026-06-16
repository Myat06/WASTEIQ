import { useEffect, useState } from 'react'
import { getEventCalendar, createEvent, getZones } from '../../services/api'
import PageHeader from '../../components/PageHeader'
import RiskBadge from '../../components/RiskBadge'

const RISK_COLORS  = { critical: '#E24B4A', high: '#EF9F27', medium: '#F59E0B', low: '#1D9E75' }
const RISK_BG      = { critical: '#FEF2F2', high: '#FFF7ED', medium: '#FEFCE8', low: '#F0FDF4' }
const EVENT_LABELS = {
  food_festival: 'Food Festival', concert: 'Concert', marathon: 'Marathon',
  political_rally: 'Political Rally', street_market: 'Street Market',
  sports_match: 'Sports Match', religious_gathering: 'Religious Gathering',
  night_market: 'Night Market', exhibition: 'Exhibition', other: 'Other',
}
const EVENT_ICONS = {
  food_festival: '🍜', concert: '🎵', marathon: '🏃', political_rally: '📣',
  street_market: '🏪', sports_match: '⚽', religious_gathering: '🕌',
  night_market: '🌙', exhibition: '🎨', other: '📌',
}
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

export default function CalendarPage() {
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [calendarData, setCalendarData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [zones, setZones] = useState([])
  const [form, setForm] = useState({
    event_name: '', event_type: 'food_festival', zone: '',
    expected_attendees: '', event_date: '', start_time: '09:00',
    duration_hours: '6', organizer_name: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([getEventCalendar(3), getZones()]).then(([calRes, zoneRes]) => {
      setCalendarData(calRes.data)
      setZones(zoneRes.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Index calendar data by date string
  const dataByDate = {}
  calendarData.forEach(d => { dataByDate[d.date] = d })

  const dateKey = (day) => {
    const m = String(viewMonth + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${viewYear}-${m}-${d}`
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelectedDay(null)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelectedDay(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      const permitNum = `EVT-${viewYear}-${String(Math.floor(Math.random() * 9000) + 1000)}`
      await createEvent({ ...form, permit_number: permitNum, status: 'approved' })
      setSubmitMsg({ type: 'success', text: 'Event permit created! Prediction generated.' })
      setShowForm(false)
      setForm({ event_name: '', event_type: 'food_festival', zone: '', expected_attendees: '', event_date: '', start_time: '09:00', duration_hours: '6', organizer_name: '' })
      // Reload calendar
      const res = await getEventCalendar(3)
      setCalendarData(res.data)
    } catch {
      setSubmitMsg({ type: 'error', text: 'Failed to create event permit.' })
    }
    setSubmitting(false)
  }

  const cells = buildCalendarGrid(viewYear, viewMonth)
  const selectedData = selectedDay ? dataByDate[dateKey(selectedDay)] : null

  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <PageHeader
        title="Event Calendar"
        subtitle="Upcoming permitted events with predicted waste impact"
        actions={
          <button onClick={() => setShowForm(v => !v)} style={{
            background: '#1D9E75', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            + Register Event Permit
          </button>
        }
      />

      {submitMsg && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13,
          background: submitMsg.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          color: submitMsg.type === 'success' ? '#1D9E75' : '#E24B4A',
        }}>
          {submitMsg.text}
        </div>
      )}

      {/* Permit Form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', marginBottom: 24, border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>New Event Permit</div>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            {[
              { label: 'Event Name', field: 'event_name', type: 'text', placeholder: 'e.g. Festival Kuliner Jakarta' },
              { label: 'Organizer', field: 'organizer_name', type: 'text', placeholder: 'Organization name' },
              { label: 'Event Date', field: 'event_date', type: 'date' },
              { label: 'Start Time', field: 'start_time', type: 'time' },
              { label: 'Duration (hours)', field: 'duration_hours', type: 'number', placeholder: '6' },
              { label: 'Expected Attendees', field: 'expected_attendees', type: 'number', placeholder: '1000' },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{label}</label>
                <input
                  type={type} required value={form[field]} placeholder={placeholder}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Event Type</label>
              <select required value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}>
                {Object.entries(EVENT_LABELS).map(([v, l]) => <option key={v} value={v}>{EVENT_ICONS[v]} {l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Zone</label>
              <select required value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}>
                <option value="">Select zone</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name} ({z.municipality})</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10 }}>
              <button type="submit" disabled={submitting} style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                {submitting ? 'Saving…' : 'Create Permit + Generate Prediction'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Calendar grid */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <button onClick={prevMonth} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #f1f5f9' }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} style={{ minHeight: 80, borderBottom: '1px solid #f8fafc', borderRight: '1px solid #f8fafc' }} />
              const key = dateKey(day)
              const dayData = dataByDate[key]
              const isToday = key === today.toISOString().slice(0, 10)
              const isSelected = selectedDay === day
              const isPast = new Date(key) < new Date(today.toISOString().slice(0, 10))

              return (
                <div
                  key={key}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  style={{
                    minHeight: 80, padding: '6px 8px',
                    borderBottom: '1px solid #f8fafc', borderRight: '1px solid #f8fafc',
                    background: isSelected ? '#EFF6FF' : 'transparent',
                    cursor: 'pointer', position: 'relative',
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
                    background: isToday ? '#1D9E75' : 'transparent',
                    color: isToday ? '#fff' : isPast ? '#cbd5e1' : '#1e293b',
                    fontSize: 13, fontWeight: isToday ? 700 : 400,
                  }}>
                    {day}
                  </div>
                  {dayData && dayData.events.map((ev, ei) => (
                    <div key={ei} style={{
                      fontSize: 10, padding: '2px 5px', borderRadius: 4, marginBottom: 2,
                      background: RISK_BG[ev.risk_level],
                      color: RISK_COLORS[ev.risk_level],
                      fontWeight: 600,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {EVENT_ICONS[ev.event_type]} {ev.event_name}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {/* Side panel */}
        <div>
          {/* Legend */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>RISK LEGEND</div>
            {Object.entries(RISK_COLORS).map(([level, color]) => (
              <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                <span style={{ fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>{level}</span>
              </div>
            ))}
          </div>

          {/* Upcoming events summary */}
          {!selectedDay && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>UPCOMING EVENTS</div>
              {loading ? (
                <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading…</div>
              ) : calendarData.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 13 }}>No upcoming events.</div>
              ) : (
                calendarData.slice(0, 6).map(day => (
                  <div key={day.date} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                      {new Date(day.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      <span style={{ float: 'right', color: RISK_COLORS[day.peak_risk] }}>{day.peak_risk.toUpperCase()}</span>
                    </div>
                    {day.events.map(ev => (
                      <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, paddingLeft: 8 }}>
                        <span style={{ fontSize: 14 }}>{EVENT_ICONS[ev.event_type]}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.event_name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{ev.zone_name} · {ev.expected_attendees.toLocaleString()} pax · ~{ev.event_waste_kg} kg extra</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Selected day detail */}
          {selectedDay && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {new Date(dateKey(selectedDay) + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>

              {!selectedData ? (
                <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                  No events scheduled.<br />
                  <button onClick={() => { setForm(f => ({ ...f, event_date: dateKey(selectedDay) })); setShowForm(true) }}
                    style={{ marginTop: 12, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    + Add Event
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{selectedData.events.length}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Events</div>
                    </div>
                    <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: RISK_COLORS[selectedData.peak_risk] }}>{Math.round(selectedData.total_waste_kg)} kg</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Extra waste</div>
                    </div>
                  </div>
                  {selectedData.events.map(ev => (
                    <div key={ev.id} style={{ border: `1px solid ${RISK_COLORS[ev.risk_level]}30`, borderLeft: `3px solid ${RISK_COLORS[ev.risk_level]}`, borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{EVENT_ICONS[ev.event_type]} {ev.event_name}</div>
                        <RiskBadge level={ev.risk_level} />
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                        <span>📍 {ev.zone_name}</span>
                        <span>🕐 {ev.start_time} ({ev.duration_hours}h)</span>
                        <span>👥 {ev.expected_attendees.toLocaleString()} pax</span>
                        <span>🗑️ ~{ev.event_waste_kg} kg extra</span>
                        <span>🚛 {ev.trucks_needed} truck(s)</span>
                        <span>👷 {ev.workers_needed} workers</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { getZones, getEvents, createEvent, importCsv } from '../../services/api'
import PageHeader from '../../components/PageHeader'
import { EVENT_TYPE_LABELS } from '../../services/constants'

export default function DataPage() {
  const [tab, setTab] = useState('events')
  const [events, setEvents] = useState([])
  const [zones, setZones] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    permit_number: '', event_name: '', event_type: 'food_festival',
    zone: '', expected_attendees: 1000, event_date: new Date().toISOString().slice(0, 10),
    start_time: '09:00', duration_hours: 6, organizer_name: '',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // CSV import state
  const fileRef = useRef()
  const [csvFile, setCsvFile] = useState(null)
  const [csvResult, setCsvResult] = useState(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvDragOver, setCsvDragOver] = useState(false)

  const load = () => {
    getEvents().then(r => setEvents(r.data))
    getZones().then(r => { setZones(r.data); if (r.data.length && !form.zone) setForm(f => ({ ...f, zone: r.data[0].id })) })
  }

  useEffect(() => { load() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createEvent({ ...form, zone: Number(form.zone), expected_attendees: Number(form.expected_attendees), duration_hours: Number(form.duration_hours) })
      setMsg('Event created and prediction auto-generated')
      setShowForm(false)
      load()
    } catch { setMsg('Failed to create event') }
    setSaving(false)
  }

  const inputStyle = { padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, width: '100%', boxSizing: 'border-box' }
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }

  const handleCsvUpload = async () => {
    if (!csvFile) return
    setCsvUploading(true)
    setCsvResult(null)
    try {
      const fd = new FormData()
      fd.append('file', csvFile)
      const res = await importCsv(fd)
      setCsvResult({ ok: true, ...res.data })
    } catch (e) {
      setCsvResult({ ok: false, error: e?.response?.data?.error || 'Upload failed' })
    }
    setCsvUploading(false)
  }

  const TABS = [
    { id: 'events', label: '📅 Events / Permits' },
    { id: 'zones', label: '🗺️ Zones' },
    { id: 'import', label: '📥 CSV Import' },
  ]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      <PageHeader title="Data Management" subtitle="Manage crowd permits and zone data"
        actions={tab === 'events' && (
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + New Event Permit
          </button>
        )}
      />

      {msg && <div style={{ background: '#EAF5EE', color: '#1D9E75', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13 }}>{msg}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 8, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? '#fff' : 'transparent',
            color: tab === t.id ? '#0f172a' : '#64748b',
            border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 13,
            fontWeight: tab === t.id ? 700 : 400, cursor: 'pointer', boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Event form */}
      {showForm && tab === 'events' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>New Crowd Permit Event</h3>
          <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Permit Number</label><input style={inputStyle} value={form.permit_number} onChange={e => setForm(f => ({ ...f, permit_number: e.target.value }))} required /></div>
            <div><label style={labelStyle}>Event Name</label><input style={inputStyle} value={form.event_name} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} required /></div>
            <div><label style={labelStyle}>Event Type</label>
              <select style={inputStyle} value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
                {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Zone</label>
              <select style={inputStyle} value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Organizer</label><input style={inputStyle} value={form.organizer_name} onChange={e => setForm(f => ({ ...f, organizer_name: e.target.value }))} required /></div>
            <div><label style={labelStyle}>Attendees</label><input style={inputStyle} type="number" value={form.expected_attendees} onChange={e => setForm(f => ({ ...f, expected_attendees: e.target.value }))} /></div>
            <div><label style={labelStyle}>Date</label><input style={inputStyle} type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} /></div>
            <div><label style={labelStyle}>Start Time</label><input style={inputStyle} type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
            <div><label style={labelStyle}>Duration (hrs)</label><input style={inputStyle} type="number" value={form.duration_hours} onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))} /></div>
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                {saving ? 'Saving...' : 'Save & Auto-Predict'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Events table */}
      {tab === 'events' && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Permit #', 'Event', 'Type', 'Zone', 'Date', 'Attendees', 'Duration', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: 12 }}>{ev.permit_number}</td>
                  <td style={{ padding: '8px 14px', fontWeight: 600 }}>{ev.event_name}</td>
                  <td style={{ padding: '8px 14px', color: '#64748b' }}>{EVENT_TYPE_LABELS[ev.event_type]}</td>
                  <td style={{ padding: '8px 14px', color: '#64748b' }}>{ev.zone_name}</td>
                  <td style={{ padding: '8px 14px', color: '#64748b' }}>{ev.event_date}</td>
                  <td style={{ padding: '8px 14px' }}>{ev.expected_attendees.toLocaleString()}</td>
                  <td style={{ padding: '8px 14px', color: '#64748b' }}>{ev.duration_hours}h</td>
                  <td style={{ padding: '8px 14px' }}>
                    <span style={{ background: ev.status === 'approved' ? '#EAF5EE' : '#f1f5f9', color: ev.status === 'approved' ? '#1D9E75' : '#94a3b8', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                      {ev.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CSV Import */}
      {tab === 'import' && (
        <div style={{ maxWidth: 640 }}>
          {/* Format reference */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>REQUIRED CSV FORMAT</div>
            <code style={{ fontSize: 12, color: '#0f172a', display: 'block', lineHeight: 1.7 }}>
              zone_name, date, waste_tons, waste_type[, vehicle_id]<br />
              Menteng, 2025-01-15, 3.2, mixed, TRK-01<br />
              Gambir, 2025-01-15, 1.8, organic,<br />
            </code>
            <div style={{ marginTop: 10, fontSize: 11, color: '#64748b' }}>
              <strong>waste_type</strong> must be one of: <code>organic</code>, <code>plastic</code>, <code>paper</code>, <code>mixed</code>&nbsp;·&nbsp;
              <strong>date</strong> format: <code>YYYY-MM-DD</code>&nbsp;·&nbsp;
              Duplicates (same zone + date + type) are skipped automatically.
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setCsvDragOver(true) }}
            onDragLeave={() => setCsvDragOver(false)}
            onDrop={e => { e.preventDefault(); setCsvDragOver(false); const f = e.dataTransfer.files[0]; if (f) { setCsvFile(f); setCsvResult(null) } }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${csvDragOver ? '#1D9E75' : csvFile ? '#1D9E75' : '#cbd5e1'}`,
              borderRadius: 12, padding: '36px 24px', textAlign: 'center', cursor: 'pointer',
              background: csvDragOver ? '#EAF5EE' : '#fff', marginBottom: 16, transition: 'all .15s',
            }}
          >
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files[0]; if (f) { setCsvFile(f); setCsvResult(null) } }} />
            <div style={{ fontSize: 32, marginBottom: 8 }}>{csvFile ? '📄' : '📥'}</div>
            {csvFile
              ? <><div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{csvFile.name}</div>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{(csvFile.size / 1024).toFixed(1)} KB · Click to change</div></>
              : <><div style={{ fontWeight: 600, color: '#475569', fontSize: 14 }}>Drag & drop your CSV here</div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>or click to browse</div></>
            }
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button
              disabled={!csvFile || csvUploading}
              onClick={handleCsvUpload}
              style={{ background: csvFile ? '#1D9E75' : '#e2e8f0', color: csvFile ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: csvFile ? 'pointer' : 'not-allowed' }}
            >
              {csvUploading ? 'Importing…' : 'Import CSV'}
            </button>
            {csvFile && <button onClick={() => { setCsvFile(null); setCsvResult(null) }} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Clear</button>}
          </div>

          {/* Result */}
          {csvResult && (
            csvResult.ok === false
              ? <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 16, color: '#DC2626', fontSize: 13 }}>❌ {csvResult.error}</div>
              : <div style={{ background: '#EAF5EE', border: '1px solid #6EE7B7', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontWeight: 700, color: '#065F46', marginBottom: 8, fontSize: 14 }}>
                    {csvResult.errors === 0 ? '✅ Import complete' : '⚠️ Import finished with warnings'}
                  </div>
                  <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
                    <span>✅ <strong>{csvResult.created}</strong> rows created</span>
                    <span>⏭️ <strong>{csvResult.skipped_duplicates}</strong> duplicates skipped</span>
                    <span style={{ color: csvResult.errors > 0 ? '#DC2626' : '#6B7280' }}>❌ <strong>{csvResult.errors}</strong> errors</span>
                  </div>
                  {csvResult.error_details?.length > 0 && (
                    <div style={{ marginTop: 12, background: '#fff', borderRadius: 8, padding: 12, fontSize: 12, color: '#64748b', maxHeight: 160, overflowY: 'auto' }}>
                      {csvResult.error_details.map((d, i) => <div key={i} style={{ padding: '2px 0' }}>• {d}</div>)}
                    </div>
                  )}
                </div>
          )}

          {/* Download template */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>DOWNLOAD TEMPLATE</div>
            <button
              onClick={() => {
                const csv = 'zone_name,date,waste_tons,waste_type,vehicle_id\nMenteng,2025-01-15,3.2,mixed,TRK-01\nGambir,2025-01-15,1.8,organic,\n'
                const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
                a.download = 'wasteiq_import_template.csv'; a.click()
              }}
              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              ⬇️ Download template.csv
            </button>
          </div>
        </div>
      )}

      {/* Zones table */}
      {tab === 'zones' && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Zone', 'Kelurahan', 'Kecamatan', 'Municipality', 'Land Use', 'Population', 'Baseline (kg)'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zones.map(z => (
                <tr key={z.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 14px', fontWeight: 600 }}>{z.name}</td>
                  <td style={{ padding: '8px 14px', color: '#64748b' }}>{z.kelurahan}</td>
                  <td style={{ padding: '8px 14px', color: '#64748b' }}>{z.kecamatan}</td>
                  <td style={{ padding: '8px 14px', color: '#64748b' }}>{z.municipality}</td>
                  <td style={{ padding: '8px 14px', color: '#64748b' }}>{z.land_use}</td>
                  <td style={{ padding: '8px 14px' }}>{z.population.toLocaleString()}</td>
                  <td style={{ padding: '8px 14px', fontWeight: 600 }}>{z.baseline_waste_kg_per_day.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

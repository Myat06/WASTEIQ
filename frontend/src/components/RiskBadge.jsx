import { RISK_COLORS, RISK_BG, RISK_LABELS } from '../services/constants'

export default function RiskBadge({ level, size = 'sm' }) {
  const pad = size === 'lg' ? '4px 12px' : '2px 8px'
  const fs = size === 'lg' ? '13px' : '11px'
  return (
    <span style={{
      background: RISK_BG[level] || '#f0f0f0',
      color: RISK_COLORS[level] || '#666',
      border: `1px solid ${RISK_COLORS[level] || '#ccc'}`,
      borderRadius: 20,
      padding: pad,
      fontSize: fs,
      fontWeight: 700,
      letterSpacing: '0.4px',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {RISK_LABELS[level] || level}
    </span>
  )
}

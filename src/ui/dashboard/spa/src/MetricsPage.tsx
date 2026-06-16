import { useMemo, useState } from 'react'
import type { DashboardMetrics } from './api.ts'
import { Section } from './Section.tsx'
import type { ThemeColors } from './styles.ts'
import { radius, spacing } from './styles.ts'

export interface MetricsPageProps {
  metrics: DashboardMetrics | undefined
  loading: boolean
  colors: ThemeColors
  onViewInbox: (notifiableType: string, notifiableId: string) => void
}

export function MetricsPage({ metrics, loading, colors, onViewInbox }: MetricsPageProps): JSX.Element {
  const deliveries = metrics?.deliveries
  const total = deliveries?.total ?? 0

  const statusSummary = useMemo(() => {
    const byStatus = deliveries?.byStatus ?? {}
    return [
      { label: 'Total', value: total, color: colors.text },
      { label: 'Sent', value: byStatus.sent ?? 0, color: colors.success },
      { label: 'Failed', value: byStatus.failed ?? 0, color: colors.danger },
      { label: 'Pending', value: byStatus.pending ?? 0, color: colors.warning },
      { label: 'Skipped', value: byStatus.skipped ?? 0, color: colors.info },
    ]
  }, [deliveries, total, colors])

  const [notifiableType, setNotifiableType] = useState('')
  const [notifiableId, setNotifiableId] = useState('')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <Section title="Overview" colors={colors} defaultOpen>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: spacing.md }}>
          {statusSummary.map((item) => (
            <div
              key={item.label}
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                padding: spacing.md,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: '0.75rem', color: colors.muted, marginTop: spacing.xs }}>{item.label}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Quick Inbox" colors={colors} defaultOpen>
        <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Notifiable type"
            value={notifiableType}
            onChange={(e) => setNotifiableType(e.target.value)}
            style={{
              padding: spacing.sm,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              color: colors.text,
              minWidth: 160,
            }}
          />
          <input
            placeholder="Notifiable ID"
            value={notifiableId}
            onChange={(e) => setNotifiableId(e.target.value)}
            style={{
              padding: spacing.sm,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              color: colors.text,
              minWidth: 120,
            }}
          />
          <button
            disabled={!notifiableType || !notifiableId}
            onClick={() => onViewInbox(notifiableType, notifiableId)}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              border: 'none',
              borderRadius: radius.md,
              backgroundColor: colors.accent,
              color: '#fff',
              cursor: 'pointer',
              opacity: !notifiableType || !notifiableId ? 0.5 : 1,
            }}
          >
            View inbox
          </button>
        </div>
      </Section>

      <Section title="Channel breakdown" colors={colors}>
        {loading && <p style={{ color: colors.muted }}>Loading...</p>}
        <KeyValueTable data={deliveries?.byChannel ?? {}} colors={colors} />
      </Section>

      <Section title="Notification type breakdown" colors={colors}>
        {loading && <p style={{ color: colors.muted }}>Loading...</p>}
        <KeyValueTable data={deliveries?.byType ?? {}} colors={colors} />
      </Section>

      {metrics?.computedAt && (
        <p style={{ color: colors.muted, fontSize: '0.75rem' }}>Computed at {new Date(metrics.computedAt).toLocaleString()}</p>
      )}
    </div>
  )
}

function KeyValueTable({
  data,
  colors,
}: {
  data: Record<string, number>
  colors: ThemeColors
}): JSX.Element {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) {
    return <p style={{ color: colors.muted }}>No data.</p>
  }
  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.md, overflow: 'hidden' }}>
      {entries.map(([key, value], idx) => (
        <div
          key={key}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: `${spacing.sm} ${spacing.md}`,
            backgroundColor: idx % 2 === 0 ? colors.surface : colors.surface2,
            borderBottom: idx === entries.length - 1 ? 'none' : `1px solid ${colors.border}`,
          }}
        >
          <span>{key}</span>
          <span style={{ fontWeight: 600 }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

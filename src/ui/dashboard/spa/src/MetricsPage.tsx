import { useMemo, useState } from 'react'
import type { JSX } from 'react'
import type { DashboardMetrics } from './api'
import { Button, EmptyState, Input, PageHeader, ProgressBar, StatusBadge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components'
import { ChannelIcon, FailedIcon, InboxIcon, PendingIcon, SentIcon, SkippedIcon, TypeIcon } from './icons'
import { motion, radius, spacing, typography } from './styles'
import type { ThemeColors } from './styles'

export interface MetricsPageProps {
  metrics: DashboardMetrics | undefined
  loading: boolean
  colors: ThemeColors
  reducedMotion: boolean
  onViewInbox: (notifiableType: string, notifiableId: string) => void
}

const statusConfig = {
  sent: { label: 'Sent', Icon: SentIcon, status: 'sent' as const },
  failed: { label: 'Failed', Icon: FailedIcon, status: 'failed' as const },
  pending: { label: 'Pending', Icon: PendingIcon, status: 'pending' as const },
  skipped: { label: 'Skipped', Icon: SkippedIcon, status: 'skipped' as const },
}

const statusOrder: Array<keyof typeof statusConfig> = ['sent', 'failed', 'pending', 'skipped']

export function MetricsPage({ metrics, loading, colors, reducedMotion, onViewInbox }: MetricsPageProps): JSX.Element {
  const deliveries = metrics?.deliveries
  const total = deliveries?.total ?? 0
  const byStatus = deliveries?.byStatus ?? {}
  const computed = metrics?.computedAt ? new Date(metrics.computedAt).toLocaleString() : undefined

  const segments = useMemo(
    () =>
      statusOrder.map((key) => ({
        value: byStatus[key] ?? 0,
        color:
          key === 'sent'
            ? colors.success
            : key === 'failed'
              ? colors.danger
              : key === 'pending'
                ? colors.warning
                : colors.info,
      })),
    [byStatus, colors]
  )

  const [notifiableType, setNotifiableType] = useState('')
  const [notifiableId, setNotifiableId] = useState('')

  return (
    <>
      <PageHeader
        title="Metrics"
        subtitle={computed ? `Last computed at ${computed}` : loading ? 'Loading metrics...' : 'No metrics available'}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['2xl'] }}>
        <section>
          <h2
            style={{
              margin: `0 0 ${spacing.lg}`,
              fontSize: typography.size.base,
              fontWeight: typography.weight.semibold,
              color: colors.text,
            }}
          >
            Delivery health
          </h2>

          {total === 0 && !loading ? (
            <EmptyState
              title="No deliveries yet"
              description="Send a notification through any channel to see delivery metrics here."
              icon={<SentIcon size={24} />}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: spacing.md,
                padding: spacing.lg,
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.sm }}>
                <span style={{ fontSize: typography.size['2xl'], fontWeight: typography.weight.semibold, color: colors.text }}>
                  {total.toLocaleString()}
                </span>
                <span style={{ fontSize: typography.size.sm, color: colors.muted }}>total deliveries</span>
              </div>

              <ProgressBar segments={segments} total={total} />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: spacing.md,
                }}
              >
                {statusOrder.map((key) => {
                  const { label, Icon, status } = statusConfig[key]
                  const value = byStatus[key] ?? 0
                  return (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.sm,
                        padding: spacing.sm,
                        borderRadius: radius.sm,
                        transition: reducedMotion ? 'none' : `background-color ${motion.duration.fast} ${motion.easing}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.surface2
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <StatusBadge status={status}>
                        <Icon size={14} />
                        {value.toLocaleString()}
                      </StatusBadge>
                      <span style={{ fontSize: typography.size.sm, color: colors.muted }}>{label}</span>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: spacing.lg, fontSize: typography.size.sm, color: colors.muted }}>
                <span>Failure rate: {(deliveries?.failureRate ?? 0).toFixed(1)}%</span>
                <span>Average attempts: {(deliveries?.averageAttempts ?? 0).toFixed(2)}</span>
              </div>
            </div>
          )}
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: spacing.xl,
            alignItems: 'start',
          }}
        >
          <BreakdownSection
            title="Channels"
            icon={<ChannelIcon size={16} />}
            data={deliveries?.byChannel ?? {}}
            colors={colors}
            emptyMessage="No channel data"
          />
          <BreakdownSection
            title="Notification types"
            icon={<TypeIcon size={16} />}
            data={deliveries?.byType ?? {}}
            colors={colors}
            emptyMessage="No type data"
          />
        </section>

        <section>
          <h2
            style={{
              margin: `0 0 ${spacing.lg}`,
              fontSize: typography.size.base,
              fontWeight: typography.weight.semibold,
              color: colors.text,
            }}
          >
            Quick inbox
          </h2>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.lg,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
            }}
          >
            <Input placeholder="Notifiable type" value={notifiableType} onChange={setNotifiableType} />
            <Input placeholder="Notifiable ID" value={notifiableId} onChange={setNotifiableId} />
            <Button
              variant="primary"
              disabled={!notifiableType || !notifiableId}
              onClick={() => onViewInbox(notifiableType, notifiableId)}
            >
              <InboxIcon size={16} />
              View inbox
            </Button>
          </div>
        </section>
      </div>
    </>
  )
}

function BreakdownSection({
  title,
  icon,
  data,
  colors,
  emptyMessage,
}: {
  title: string
  icon: JSX.Element
  data: Record<string, number>
  colors: ThemeColors
  emptyMessage: string
}): JSX.Element {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const max = entries.length > 0 ? entries[0][1] : 0

  return (
    <div>
      <h2
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          margin: `0 0 ${spacing.lg}`,
          fontSize: typography.size.base,
          fontWeight: typography.weight.semibold,
          color: colors.text,
        }}
      >
        {icon}
        {title}
      </h2>
      {entries.length === 0 ? (
        <p style={{ color: colors.muted, fontSize: typography.size.sm }}>{emptyMessage}</p>
      ) : (
        <Table>
          <TableHead>
            <TableHeader>Name</TableHeader>
            <TableHeader align="right">Count</TableHeader>
            <TableHeader>Distribution</TableHeader>
          </TableHead>
          <TableBody>
            {entries.map(([name, count]) => (
              <TableRow key={name}>
                <TableCell>{name}</TableCell>
                <TableCell align="right">{count.toLocaleString()}</TableCell>
                <TableCell>
                  <div
                    style={{
                      height: '6px',
                      width: `${max > 0 ? (count / max) * 100 : 0}%`,
                      minWidth: '4px',
                      borderRadius: radius.sm,
                      backgroundColor: colors.accent,
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

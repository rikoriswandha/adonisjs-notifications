import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { deleteNotification, getInbox, markAllAsRead, markAsRead, markAsUnread } from './api.ts'
import { useAsync, useWindowFocus } from './hooks.ts'
import { Section } from './Section.tsx'
import type { ThemeColors } from './styles.ts'
import { radius, spacing } from './styles.ts'

export interface InboxPageProps {
  notifiableType: string
  notifiableId: string
  metrics: { inbox: { total: number; unread: number } | null } | undefined
  colors: ThemeColors
  onBack: () => void
}

export function InboxPage({ notifiableType, notifiableId, metrics, colors, onBack }: InboxPageProps): JSX.Element {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage] = useState(25)

  const load = useCallback(
    () => getInbox(notifiableType, notifiableId, { page, perPage, unreadOnly }),
    [notifiableType, notifiableId, page, perPage, unreadOnly]
  )
  const inbox = useAsync(load, [notifiableType, notifiableId, page, perPage, unreadOnly])

  useWindowFocus(() => {
    inbox.refresh()
  })

  const total = metrics?.inbox?.total ?? inbox.data?.total ?? 0
  const unread = metrics?.inbox?.unread ?? inbox.data?.unreadCount ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
        <button
          onClick={onBack}
          style={{
            padding: `${spacing.sm} ${spacing.md}`,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            color: colors.text,
            borderRadius: radius.md,
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
          Inbox — {notifiableType} {notifiableId}
        </h2>
        <span style={{ color: colors.muted }}>
          {unread} unread / {total} total
        </span>
      </div>

      <Section title="Filters" colors={colors} defaultOpen>
        <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked)
                setPage(1)
              }}
            />
            Unread only
          </label>
          <button
            onClick={async () => {
              await markAllAsRead(notifiableType, notifiableId)
              inbox.refresh()
            }}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              border: 'none',
              borderRadius: radius.md,
              backgroundColor: colors.accent,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Mark all read
          </button>
        </div>
      </Section>

      <Section title="Notifications" colors={colors} defaultOpen>
        {inbox.loading && <p style={{ color: colors.muted }}>Loading...</p>}
        {inbox.error && <p style={{ color: colors.danger }}>{inbox.error}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          {(inbox.data?.notifications ?? []).map((n) => (
            <NotificationRow key={n.id} notification={n} colors={colors} onChange={() => inbox.refresh()} />
          ))}
          {!inbox.loading && inbox.data?.notifications.length === 0 && (
            <p style={{ color: colors.muted }}>No notifications found.</p>
          )}
        </div>

        {total > perPage && (
          <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.surface,
                color: colors.text,
                borderRadius: radius.md,
                cursor: 'pointer',
                opacity: page <= 1 ? 0.5 : 1,
              }}
            >
              Previous
            </button>
            <span style={{ color: colors.muted }}>
              Page {page} of {Math.max(1, Math.ceil(total / perPage))}
            </span>
            <button
              disabled={page * perPage >= total}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.surface,
                color: colors.text,
                borderRadius: radius.md,
                cursor: 'pointer',
                opacity: page * perPage >= total ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        )}
      </Section>
    </div>
  )
}

interface NotificationRowProps {
  notification: {
    id: string
    type: string
    data: unknown
    readAt: string | null
    createdAt: string
  }
  colors: ThemeColors
  onChange: () => void
}

function NotificationRow({ notification, colors, onChange }: NotificationRowProps): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!deleting) return
    const timer = setTimeout(() => {
      deleteNotification(notification.id).then(onChange).catch(() => setDeleting(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [deleting, notification.id, onChange])

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        backgroundColor: notification.readAt ? colors.surface : colors.surface2,
        opacity: deleting ? 0 : 1,
        transform: deleting ? 'translateX(20px)' : 'translateX(0)',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: spacing.md,
          border: 'none',
          background: 'transparent',
          color: colors.text,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
          <span style={{ fontWeight: 600 }}>{notification.type}</span>
          <span style={{ fontSize: '0.75rem', color: colors.muted }}>
            {new Date(notification.createdAt).toLocaleString()}
          </span>
        </div>
        <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
          {!notification.readAt && <span style={{ color: colors.info, fontSize: '0.75rem' }}>Unread</span>}
          <span style={{ color: colors.muted }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: `0 ${spacing.md} ${spacing.md}` }}>
          <pre
            style={{
              backgroundColor: colors.surface3,
              padding: spacing.md,
              borderRadius: radius.sm,
              overflow: 'auto',
              fontSize: '0.75rem',
              color: colors.text,
            }}
          >
            {JSON.stringify(notification.data, null, 2)}
          </pre>
          <div style={{ display: 'flex', gap: spacing.sm }}>
            {notification.readAt ? (
              <ActionButton colors={colors} onClick={() => markAsUnread(notification.id).then(onChange)}>
                Mark unread
              </ActionButton>
            ) : (
              <ActionButton colors={colors} onClick={() => markAsRead(notification.id).then(onChange)}>
                Mark read
              </ActionButton>
            )}
            <ActionButton colors={colors} danger onClick={() => setDeleting(true)}>
              Delete
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  colors,
  danger = false,
}: {
  children: ReactNode
  onClick: () => void
  colors: ThemeColors
  danger?: boolean
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        padding: `${spacing.sm} ${spacing.md}`,
        border: 'none',
        borderRadius: radius.md,
        backgroundColor: danger ? colors.danger : colors.surface3,
        color: danger ? '#fff' : colors.text,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

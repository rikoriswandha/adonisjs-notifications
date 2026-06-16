import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import { deleteNotification, getInbox, markAllAsRead, markAsRead, markAsUnread } from './api'
import type { InboxResult } from './api'
import { Badge, Button, EmptyState, IconButton } from './components'
import { ArrowLeftIcon, CheckIcon, ChevronDownIcon, EnvelopeClosedIcon, EnvelopeOpenIcon, TrashIcon } from './icons'
import { useAsync, useWindowFocus } from './hooks'
import { motion, radius, spacing, typography } from './styles'
import type { ThemeColors } from './styles'

export interface InboxPageProps {
  notifiableType: string
  notifiableId: string
  metrics: { inbox: { total: number; unread: number } | null } | undefined
  colors: ThemeColors
  reducedMotion: boolean
  onBack: () => void
}

export function InboxPage({
  notifiableType,
  notifiableId,
  metrics,
  colors,
  reducedMotion,
  onBack,
}: InboxPageProps): JSX.Element {
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

  const title = `${notifiableType} ${notifiableId}`

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: spacing.md,
          flexWrap: 'wrap',
          marginBottom: spacing.xl,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeftIcon size={16} />
              Back
            </Button>
            <h1
              style={{
                margin: 0,
                fontSize: typography.size.xl,
                fontWeight: typography.weight.semibold,
                lineHeight: typography.lineHeight.heading,
                color: colors.text,
              }}
            >
              Inbox
            </h1>
          </div>
          <p style={{ margin: 0, color: colors.muted, fontSize: typography.size.sm }}>
            {title}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Badge color={colors.text} icon={<EnvelopeOpenIcon size={14} />}>
            {total.toLocaleString()} total
          </Badge>
          {unread > 0 && (
            <Badge color={colors.info} icon={<EnvelopeClosedIcon size={14} />}>
              {unread.toLocaleString()} unread
            </Badge>
          )}
          <Button
            variant="secondary"
            onClick={async () => {
              await markAllAsRead(notifiableType, notifiableId)
              inbox.refresh()
            }}
          >
            <CheckIcon size={16} />
            Mark all read
          </Button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: spacing.md,
          padding: `${spacing.md} ${spacing.lg}`,
          marginBottom: spacing.xl,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
        }}
      >
        <FilterToggle
          label="Unread only"
          checked={unreadOnly}
          onChange={(checked) => {
            setUnreadOnly(checked)
            setPage(1)
          }}
          colors={colors}
        />
      </div>

      {inbox.loading && inbox.data === undefined ? (
        <LoadingList colors={colors} />
      ) : inbox.error ? (
        <div
          style={{
            padding: `${spacing.md} ${spacing.lg}`,
            borderRadius: radius.md,
            backgroundColor: colors.dangerBg,
            color: colors.danger,
            fontSize: typography.size.sm,
          }}
          role="alert"
        >
          {inbox.error}
        </div>
      ) : inbox.data?.notifications.length === 0 ? (
        <EmptyState
          title={unreadOnly ? 'No unread notifications' : 'No notifications'}
          description={
            unreadOnly
              ? 'All notifications have been read.'
              : `There are no notifications for ${title} yet.`
          }
          icon={<EnvelopeOpenIcon size={24} />}
        />
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              overflow: 'hidden',
            }}
          >
            {(inbox.data?.notifications ?? []).map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                colors={colors}
                reducedMotion={reducedMotion}
                onChange={() => inbox.refresh()}
              />
            ))}
          </div>

          {total > perPage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.md,
                marginTop: spacing.lg,
              }}
            >
              <span style={{ color: colors.muted, fontSize: typography.size.sm }}>
                Showing {(page - 1) * perPage + 1}–
                {Math.min(page * perPage, total)} of {total.toLocaleString()}
              </span>
              <div style={{ display: 'flex', gap: spacing.sm }}>
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={page * perPage >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

function FilterToggle({
  label,
  checked,
  onChange,
  colors,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  colors: ThemeColors
}): JSX.Element {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.sm,
        cursor: 'pointer',
        fontSize: typography.size.sm,
        color: colors.text,
        userSelect: 'none',
      }}
    >
      <span
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            onChange(!checked)
          }
        }}
        tabIndex={0}
        style={{
          width: '36px',
          height: '20px',
          borderRadius: '999px',
          backgroundColor: checked ? colors.accent : colors.border,
          position: 'relative',
          transition: `background-color ${motion.duration.base} ${motion.easing}`,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '18px' : '2px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: colors.accentContrast,
            transition: `left ${motion.duration.base} ${motion.easing}`,
          }}
        />
      </span>
      {label}
    </label>
  )
}

interface NotificationRowProps {
  notification: InboxResult['notifications'][number]
  colors: ThemeColors
  reducedMotion: boolean
  onChange: () => void
}

function NotificationRow({ notification, colors, reducedMotion, onChange }: NotificationRowProps): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [removed, setRemoved] = useState(false)

  useEffect(() => {
    if (!removed) return
    const timer = setTimeout(() => {
      deleteNotification(notification.id).then(onChange).catch(() => setRemoved(false))
    }, 200)
    return () => clearTimeout(timer)
  }, [removed, notification.id, onChange])

  const read = notification.readAt !== null
  const Icon = read ? EnvelopeOpenIcon : EnvelopeClosedIcon
  const iconColor = read ? colors.muted : colors.info

  return (
    <div
      style={{
        opacity: removed ? 0 : 1,
        transform: removed ? 'translateX(8px)' : 'translateX(0)',
        transition: reducedMotion
          ? 'none'
          : `opacity ${motion.duration.base} ${motion.easing}, transform ${motion.duration.base} ${motion.easing}`,
        borderBottom: `1px solid ${colors.borderSubtle}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          padding: `${spacing.md} ${spacing.lg}`,
          backgroundColor: read ? 'transparent' : colors.infoBg,
        }}
      >
        <div style={{ color: iconColor, flexShrink: 0 }}>
          <Icon size={18} />
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
            border: 'none',
            background: 'transparent',
            color: colors.text,
            textAlign: 'left',
            cursor: 'pointer',
            padding: 0,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontWeight: read ? typography.weight.medium : typography.weight.semibold,
              fontSize: typography.size.sm,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {notification.type}
          </span>
          <span
            style={{
              color: colors.muted,
              fontSize: typography.size.xs,
              whiteSpace: 'nowrap',
            }}
          >
            {new Date(notification.createdAt).toLocaleString()}
          </span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, flexShrink: 0 }}>
          {!read && (
            <IconButton
              label="Mark as read"
              onClick={() => markAsRead(notification.id).then(onChange)}
            >
              <CheckIcon size={16} />
            </IconButton>
          )}
          {read && (
            <IconButton
              label="Mark as unread"
              onClick={() => markAsUnread(notification.id).then(onChange)}
            >
              <EnvelopeClosedIcon size={16} />
            </IconButton>
          )}
          <IconButton label="Delete notification" variant="danger" onClick={() => setRemoved(true)}>
            <TrashIcon size={16} />
          </IconButton>
          <div
            style={{
              color: colors.muted,
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: reducedMotion ? 'none' : `transform ${motion.duration.base} ${motion.easing}`,
            }}
          >
            <ChevronDownIcon size={16} />
          </div>
        </div>
      </div>

      {expanded && (
        <div
          style={{
            padding: `0 ${spacing.lg} ${spacing.lg}`,
            backgroundColor: read ? 'transparent' : colors.infoBg,
          }}
        >
          <pre
            style={{
              margin: 0,
              padding: spacing.md,
              borderRadius: radius.sm,
              backgroundColor: colors.surface3,
              color: colors.text,
              fontSize: typography.size.xs,
              overflow: 'auto',
              lineHeight: typography.lineHeight.body,
            }}
          >
            {JSON.stringify(notification.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function LoadingList({ colors }: { colors: ThemeColors }): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sm,
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '56px',
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
          }}
        />
      ))}
    </div>
  )
}

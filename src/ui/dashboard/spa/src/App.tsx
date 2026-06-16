import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import { getMetrics } from './api'
import type { DashboardMetrics } from './api'
import { Button } from './components'
import { ActivityIcon, InboxIcon, MoonIcon, SunIcon } from './icons'
import { useAsync, useReducedMotion, useTheme, useWindowFocus } from './hooks'
import { InboxPage } from './InboxPage'
import { MetricsPage } from './MetricsPage'
import { getThemeColors, radius, spacing, themeVariables, typography } from './styles'

export interface RouteInfo {
  name: 'metrics' | 'inbox'
  notifiableType?: string
  notifiableId?: string
}

function basePath(): string {
  const raw = window.__DASHBOARD_BASE_PATH__ ?? ''
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

function parseRoute(path: string): RouteInfo {
  const relative = path.replace(basePath(), '') || '/'
  const match = relative.match(/^\/inbox\/([^/]+)\/([^/]+)/)
  if (match) {
    return { name: 'inbox', notifiableType: match[1], notifiableId: match[2] }
  }
  return { name: 'metrics' }
}

function hrefFor(route: RouteInfo): string {
  if (route.name === 'inbox' && route.notifiableType && route.notifiableId) {
    return `${basePath()}/inbox/${route.notifiableType}/${route.notifiableId}`
  }
  return `${basePath()}/`
}

function getInitialMetrics(): DashboardMetrics | undefined {
  const initial = window.__DASHBOARD_INITIAL_DATA__
  if (initial && typeof initial === 'object' && 'metrics' in initial) {
    return initial.metrics as DashboardMetrics
  }
  return undefined
}

export function App(): JSX.Element {
  const { dark, toggle } = useTheme()
  const reducedMotion = useReducedMotion()
  const colors = useMemo(() => getThemeColors(dark), [dark])
  const variables = useMemo(() => themeVariables(dark), [dark])
  const [route, setRoute] = useState<RouteInfo>(() => parseRoute(window.location.pathname))

  const metricsLoad = useCallback(() => getMetrics(), [])
  const metrics = useAsync(metricsLoad, [route.name], getInitialMetrics())

  const navigate = useCallback((next: RouteInfo) => {
    const href = hrefFor(next)
    window.history.pushState({}, '', href)
    setRoute(next)
  }, [])

  useEffect(() => {
    const onPopState = () => setRoute(parseRoute(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useWindowFocus(() => {
    metrics.refresh()
  })

  return (
    <div
      style={{
        ...variables,
        minHeight: '100vh',
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          height: '56px',
          padding: `0 ${spacing.lg}`,
          backgroundColor: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
          boxShadow: dark
            ? '0 1px 0 oklch(100% 0 0 / 0.06), 0 2px 6px oklch(0% 0 0 / 0.12)'
            : '0 1px 0 oklch(0% 0 0 / 0.04), 0 2px 6px oklch(0% 0 0 / 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.accent }}>
            <ActivityIcon size={20} />
            <span
              style={{
                fontSize: typography.size.base,
                fontWeight: typography.weight.semibold,
                letterSpacing: '-0.01em',
              }}
            >
              Notifications
            </span>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
            <NavLink
              active={route.name === 'metrics'}
              onClick={() => navigate({ name: 'metrics' })}
              icon={<ActivityIcon size={16} />}
            >
              Metrics
            </NavLink>
            {route.name === 'inbox' && route.notifiableType && route.notifiableId && (
              <NavLink active icon={<InboxIcon size={16} />} onClick={() => {}}>
                Inbox
              </NavLink>
            )}
          </nav>
        </div>

        <Button variant="ghost" onClick={toggle} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {dark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          <span style={{ marginLeft: spacing.xs }}>{dark ? 'Light' : 'Dark'}</span>
        </Button>
      </header>

      <main style={{ padding: `${spacing.xl} ${spacing.lg}` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {metrics.error && (
            <div
              style={{
                padding: `${spacing.md} ${spacing.lg}`,
                marginBottom: spacing.lg,
                borderRadius: radius.md,
                backgroundColor: colors.dangerBg,
                color: colors.danger,
                fontSize: typography.size.sm,
              }}
              role="alert"
            >
              {metrics.error}
            </div>
          )}

          {route.name === 'metrics' && (
            <MetricsPage
              metrics={metrics.data}
              loading={metrics.loading}
              colors={colors}
              reducedMotion={reducedMotion}
              onViewInbox={(type: string, id: string) =>
                navigate({ name: 'inbox', notifiableType: type, notifiableId: id })
              }
            />
          )}

          {route.name === 'inbox' && route.notifiableType && route.notifiableId && (
            <InboxPage
              notifiableType={route.notifiableType}
              notifiableId={route.notifiableId}
              metrics={metrics.data}
              colors={colors}
              reducedMotion={reducedMotion}
              onBack={() => navigate({ name: 'metrics' })}
            />
          )}
        </div>
      </main>
    </div>
  )
}

function NavLink({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  icon: ReactNode
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: `${spacing.sm} ${spacing.md}`,
        border: 'none',
        borderRadius: radius.md,
        backgroundColor: active ? 'var(--color-accent-bg)' : 'transparent',
        color: active ? 'var(--color-accent)' : 'var(--color-muted)',
        fontSize: typography.size.sm,
        fontWeight: active ? typography.weight.semibold : typography.weight.medium,
        cursor: 'pointer',
        transition: `background-color 150ms cubic-bezier(0.25, 1, 0.5, 1), color 150ms cubic-bezier(0.25, 1, 0.5, 1)`,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {icon}
      {children}
    </button>
  )
}

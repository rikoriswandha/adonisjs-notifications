import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode, JSX } from 'react'
import { getMetrics } from './api'
import { useAsync, useTheme, useWindowFocus } from './hooks'
import { InboxPage } from './InboxPage'
import { MetricsPage } from './MetricsPage'
import { cn, getThemeColors, radius, spacing } from './styles'
import type { ThemeColors } from './styles'

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

export function App(): JSX.Element {
  const { dark, toggle } = useTheme()
  const colors = useMemo(() => getThemeColors(dark), [dark])
  const [route, setRoute] = useState<RouteInfo>(() => parseRoute(window.location.pathname))

  const metricsLoad = useCallback(() => getMetrics(), [])
  const metrics = useAsync(metricsLoad, [route.name])

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
        minHeight: '100vh',
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      <header
        style={{
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.surface,
          padding: `${spacing.md} ${spacing.lg}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <h1 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Notifications Dashboard</h1>
          <nav style={{ display: 'flex', gap: spacing.sm }}>
            <NavLink active={route.name === 'metrics'} onClick={() => navigate({ name: 'metrics' })} colors={colors}>
              Metrics
            </NavLink>
            {route.name === 'inbox' && route.notifiableType && route.notifiableId && (
              <NavLink active={true} onClick={() => {}} colors={colors}>
                Inbox
              </NavLink>
            )}
          </nav>
        </div>
        <button
          onClick={toggle}
          style={{
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface2,
            color: colors.text,
            borderRadius: radius.md,
            padding: `${spacing.sm} ${spacing.md}`,
            cursor: 'pointer',
          }}
        >
          {dark ? 'Light' : 'Dark'}
        </button>
      </header>

      <main style={{ padding: spacing.lg, maxWidth: 1200, margin: '0 auto' }}>
        {metrics.error && (
          <div
            style={{
              padding: spacing.md,
              backgroundColor: colors.danger + '20',
              color: colors.danger,
              borderRadius: radius.md,
              marginBottom: spacing.md,
            }}
          >
            {metrics.error}
          </div>
        )}

        {route.name === 'metrics' && (
          <MetricsPage
            metrics={metrics.data}
            loading={metrics.loading}
            colors={colors}
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
            onBack={() => navigate({ name: 'metrics' })}
          />
        )}
      </main>
    </div>
  )
}

function NavLink({
  active,
  onClick,
  children,
  colors,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  colors: ThemeColors
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn('nav-link', active && 'active')}
      style={{
        border: 'none',
        background: 'transparent',
        color: active ? colors.accent : colors.muted,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        padding: `${spacing.sm} ${spacing.md}`,
      }}
    >
      {children}
    </button>
  )
}

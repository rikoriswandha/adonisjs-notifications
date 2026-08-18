# Metrics Dashboard

The package ships with an optional metrics dashboard for inspecting notification delivery and inbox stats.

## Enabling

When you run `node ace configure @rikology/adonisjs-notifications`, answer **yes** to the dashboard prompt. Then add the routes to `start/routes.ts`:

```ts
import { notificationDashboardRoutes } from '@rikology/adonisjs-notifications/ui/dashboard'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    notificationDashboardRoutes()
  })
  .prefix('/notifications/dashboard')
```

The consumer controls the prefix and any middleware:

```ts
router
  .group(() => {
    notificationDashboardRoutes()
  })
  .prefix('/admin/notifications')
  .use(middleware.auth())
```

## Production authorization

Dashboard API routes are disabled in production unless you provide an `authorize` callback. The
callback runs before the notification manager is resolved and receives the exact resource targeted
by the request.

```ts
router
  .group(() => {
    notificationDashboardRoutes({
      authorize: async (ctx, resource) => {
        await ctx.auth.authenticate()

        // Keep the administrative dashboard admin-only. `resource` also contains
        // notifiableType/notifiableId or notificationId for finer-grained policies.
        return ctx.auth.user?.isAdmin === true
      },
    })
  })
  .prefix('/admin/notifications')
  .use(middleware.auth())
```

Returning `false` sends a `403 Forbidden` response. Throwing from the callback preserves your
application's normal authentication or authorization error handling. A middleware wrapper is still
recommended as defense in depth, but does not replace the callback in production.

## Routes
| Route | Description |
|---|---|
| `GET /` | React dashboard SPA (development only by default) |
| `GET /api/metrics` | JSON endpoint returning `NotificationMetrics` |
| `GET /api/inbox/:notifiableType/:notifiableId` | Paginated inbox for a single notifiable |

## JSON endpoint

```bash
curl /notifications/dashboard/metrics.json
```

Response:

```json
{
  "inbox": null,
  "deliveries": {
    "total": 42,
    "byStatus": { "pending": 2, "sent": 36, "failed": 3, "skipped": 1 },
    "byChannel": { "mail": 30, "database": 12 },
    "byType": { "InvoicePaid": 20, "WelcomeMessage": 22 },
    "byChannelAndStatus": {
      "mail": { "pending": 1, "sent": 28, "failed": 2, "skipped": 0 },
      "database": { "pending": 1, "sent": 8, "failed": 1, "skipped": 1 }
    },
    "averageAttempts": 1.1,
    "failureRate": 0.071
  },
  "computedAt": "2026-06-09T12:00:00.000Z"
}
```

## Filtering

All endpoints accept query params that scope the delivery metrics:

```bash
curl '/notifications/dashboard/metrics.json?channel=mail&status=failed&from=2026-01-01&to=2026-06-01'
```

| Param | Type | Description |
|---|---|---|
| `channel` | string | Filter by delivery channel |
| `notificationType` | string | Filter by notification class name |
| `status` | `pending` \| `sent` \| `failed` \| `skipped` | Filter by delivery status |
| `from` | ISO date | Include deliveries created on or after |
| `to` | ISO date | Include deliveries created on or before |

`inbox/:notifiableType/:notifiableId` also accepts these filters and adds `notifiableType`/`notifiableId` to the delivery query automatically.

## Programmatic access

Import `getMetrics()` directly to build your own endpoints or admin panels:

```ts
import notifications from '@rikology/adonisjs-notifications/services/main'

const metrics = await notifications.getMetrics({
  notifiableType: 'User',
  notifiableId: 1,
  filter: { channel: 'mail', status: 'sent' },
})
```

Returns `NotificationMetrics`:

```ts
interface NotificationMetrics {
  inbox: InboxMetrics | null
  deliveries: DeliveryMetrics
  computedAt: string
}

interface InboxMetrics {
  total: number
  unread: number
  read: number
  unseen: number
  byType: Record<string, number>
}

interface DeliveryMetrics {
  total: number
  byStatus: Record<'pending' | 'sent' | 'failed' | 'skipped', number>
  byChannel: Record<string, number>
  byType: Record<string, number>
  byChannelAndStatus: Record<string, Record<'pending' | 'sent' | 'failed' | 'skipped', number>>
  averageAttempts: number
  failureRate: number
}
```

`inbox` is `null` unless both `notifiableType` and `notifiableId` are provided.

When no repository is configured, `getMetrics()` returns a zero-value structure without throwing.

## Custom styling

The dashboard is a React single-page application built into `src/ui/dashboard/spa`. It ships with a warm, light-first design system: OKLCH color tokens, a single terracotta accent, custom SVG icons, and a dark mode toggle. You can reuse the JSON endpoints to build a completely custom admin panel if the bundled UI does not fit your app.

Design tokens and decisions live in `PRODUCT.md` and `DESIGN.md` at the repository root.

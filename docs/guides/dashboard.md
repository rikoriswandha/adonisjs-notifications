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

## Routes

| Route | Description |
|---|---|
| `GET /` | HTML dashboard page with summary cards and tables |
| `GET /metrics.json` | JSON endpoint returning `NotificationMetrics` |
| `GET /inbox/:notifiableType/:notifiableId` | Dashboard scoped to a single notifiable's inbox |

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

The HTML page uses Tailwind CSS via the Play CDN. The dashboard renders via a pure string function (`createDashboardHtml`) so the package does not need to register Edge view paths. Build your own UI using the JSON endpoint data when you need full control.

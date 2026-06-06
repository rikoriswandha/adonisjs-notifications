# Example: Queued Mail Notification

A mail notification that is dispatched to the queue for background delivery.

## Notification class

```ts
// app/notifications/weekly_digest.ts
import { Notification, MailMessage } from 'adonisjs-notifications'

export default class WeeklyDigest extends Notification {
  public shouldQueue = true
  public queue = 'email-digest'
  public connection = 'redis'

  constructor(private summary: { totalPosts: number; topPosts: string[] }) {
    super()
  }

  via(notifiable: unknown) {
    return ['mail']
  }

  toMail(notifiable: unknown) {
    const message = MailMessage.create()
      .subject('Your Weekly Digest')
      .greeting(`Hi there,`)
      .line(`Here is what happened this week:`)
      .line(`- ${this.summary.totalPosts} new posts`)

    for (const post of this.summary.topPosts) {
      message.line(`  - ${post}`)
    }

    return message.action('Read More', 'https://app.example.com/digest')
  }

  delay(notifiable: unknown, channel: string) {
    // Send digest emails at 9 AM tomorrow
    if (channel === 'mail') {
      return '24h'
    }
    return null
  }
}
```

## Sending from a command

```ts
// commands/send_weekly_digest.ts
import { BaseCommand } from '@adonisjs/core/ace'
import notifications from 'adonisjs-notifications/services/main'
import WeeklyDigest from '#notifications/weekly_digest'

export default class SendWeeklyDigest extends BaseCommand {
  static commandName = 'digest:send'

  async run() {
    const users = await User.query().whereNotNull('email')

    for (const user of users) {
      const summary = await this.buildDigest(user)
      await user.notify(new WeeklyDigest(summary))
    }

    this.logger.success(`Queued ${users.length} digest emails`)
  }

  private async buildDigest(user: User) {
    // Fetch user's personalized digest content
    return {
      totalPosts: 42,
      topPosts: ['Getting Started Guide', 'Advanced Tips', 'Community Highlights'],
    }
  }
}
```

## Delivery tracking

With `delivery.recordAttempts: true`, each queued delivery creates a row in `notification_deliveries`:

|Column|Value|
|---|---|
|status|'pending'|
|channel|'mail'|
|dedupeKey|WeeklyDigest:abc123:User:1:mail|
|attempts|0|

After successful delivery:

|Column|Value|
|---|---|
|status|'sent'|
|sent_at|2024-01-15 09:00:00|
|provider_message_id|<msg-id@mailgun>|
|attempts|1|

## Retry failed deliveries

```bash
# Retry all failed mail deliveries
node ace notifications:retry-failed --channel=mail

# Retry with limit
node ace notifications:retry-failed --channel=mail --limit=100
```

Note: The `notifications:retry-failed` command needs to be implemented in your app using `NotificationManager.retryFailedDeliveries()`.

## Key points

- `shouldQueue = true` dispatches each channel delivery to the queue
- `queue` and `connection` per-notification override config defaults
- `delay()` provides per-channel scheduling
- Delivery tracking shows full audit trail
- Retry logic handles transient failures automatically

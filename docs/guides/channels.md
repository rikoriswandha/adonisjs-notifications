# Built-in Channels

Four channels ship with the package.

## Mail channel

Factory: `channels.mail()`
Requires: `@adonisjs/mail`

Sends email via AdonisJS Mail. Expects `toMail()` to return a `MailMessage` or `MailMessageOptions`.

```ts
import { channels } from '@rikology/adonisjs-notifications'

channels: {
  mail: channels.mail(),
}
```

The mail channel:
- Resolves the recipient from route resolution
- Supports custom mailer via `MailMessage.mailer('transactional')`
- Supports priority, CC, BCC, reply-to
- Sends via Edge template views or raw HTML/text
- Records the provider message ID in delivery tracking

## Database channel

Factory: `channels.database()`
Requires: `@adonisjs/lucid`

Stores the `toDatabase()` payload as JSON in the `notifications` table.

```ts
import { channels } from '@rikology/adonisjs-notifications'

channels: {
  database: channels.database(),
}
```

The database channel:
- Does not require a route (stores by notifiable type/id)
- Supports polymorphic notifiables
- Stores metadata alongside notification data
- Integrates with `withNotifications()` mixin for querying

## Log channel

Factory: `channels.log()`
Requires: nothing

Writes structured logs via AdonisJS Pino logger.

```ts
import { channels } from '@rikology/adonisjs-notifications'

channels: {
  log: channels.log(),
}
```

The log channel:
- Resolves its own message (uses `toLog()` if present, otherwise class name)
- Auto-redacts PII: emails, phone numbers, URLs with tokens, JWTs
- Logs at `info` level on success, `error` level on failure
- Records `loggedAt` timestamp in result metadata

## Null channel

Factory: `channels.null()`
Requires: nothing

No-op delivery, useful for testing.

```ts
import { channels } from '@rikology/adonisjs-notifications'

channels: {
  null: channels.null(),
}
```

The null channel:
- Returns success immediately
- Records `processedAt` timestamp
- Useful for feature flags or disabling channels per-environment

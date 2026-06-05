# adonisjs-notifications

Send notifications through multiple channels with Laravel-inspired ergonomics for AdonisJS v7.

## Installation

```bash
npm i adonisjs-notifications
```

## Quick usage

```ts
import notifications from 'adonisjs-notifications/services/main'

await notifications.send(new OrderShippedNotification(order), user)
```

## Configure

```bash
node ace configure adonisjs-notifications
```

## Documentation

Full documentation is coming soon. For now, see the source code and inline JSDoc comments.

## License

MIT

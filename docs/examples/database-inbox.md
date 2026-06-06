# Example: Database Inbox

A full database notification inbox implementation.

## User model with mixin

```ts
// app/models/user.ts
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { withNotifications } from 'adonisjs-notifications/mixins'

export default class User extends compose(BaseModel, withNotifications()) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column()
  declare fullName: string
}
```

## Notification class

```ts
// app/notifications/mention.ts
import { Notification } from 'adonisjs-notifications'

export default class Mention extends Notification {
  constructor(
    private postId: number,
    private postTitle: string,
    private mentionedBy: string
  ) {
    super()
  }

  via(notifiable: unknown) {
    return ['database']
  }

  toDatabase(notifiable: unknown) {
    return {
      title: 'New Mention',
      body: `${this.mentionedBy} mentioned you in "${this.postTitle}"`,
      postId: this.postId,
      mentionedBy: this.mentionedBy,
      actionUrl: `/posts/${this.postId}`,
    }
  }
}
```

## Store notification

```ts
const user = await User.findOrFail(1)
await user.notify(new Mention(42, 'Hello World', 'alice'))
```

## List unread notifications

```ts
// app/controllers/notifications_controller.ts
export default class NotificationsController {
  async index({ auth, request }: HttpContext) {
    const user = await auth.getUserOrFail()
    const page = request.input('page', 1)
    const perPage = request.input('perPage', 20)

    const notifications = await (await user.unreadNotifications())
      .query()
      .paginate(page, perPage)

    return notifications
  }
}
```

## Mark as read

```ts
// app/controllers/notifications_controller.ts
export default class NotificationsController {
  async markAsRead({ auth, params }: HttpContext) {
    const user = await auth.getUserOrFail()
    // Using the repository directly for single notification
    const manager = await notifications
    // For bulk: mark all as read
    await user.markNotificationsAsRead()

    return { message: 'All notifications marked as read' }
  }
}
```

## Unread count badge

```ts
// app/controllers/notifications_controller.ts
export default class NotificationsController {
  async unreadCount({ auth }: HttpContext) {
    const user = await auth.getUserOrFail()
    const count = await user.unreadNotificationsCount()

    return { count }
  }
}
```

## Query with pagination

```ts
const all = await (await user.notifications())
  .query()
  .where('data', 'like', '%postId: 42%')
  .orderBy('created_at', 'desc')
  .paginate(1, 10)
```

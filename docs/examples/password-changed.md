# Example: Password Changed Notification

A security notification sent via mail when a user changes their password.

## Notification class

```ts
// app/notifications/password_changed.ts
import { Notification, MailMessage } from '@rikology/adonisjs-notifications'

export default class PasswordChanged extends Notification {
  public priority = 'critical'

  constructor(private changedAt: Date) {
    super()
  }

  via(notifiable: unknown) {
    return ['mail']
  }

  toMail(notifiable: unknown) {
    return MailMessage.create()
      .subject('Security Alert: Password Changed')
      .greeting('Hello,')
      .line('Your password was recently changed.')
      .line(`Time: ${this.changedAt.toLocaleString()}`)
      .line('If you did not make this change, please reset your password immediately.')
      .action('Reset Password', 'https://app.example.com/reset-password')
      .priority('high')
      .tags(['security', 'password'])
  }
}
```

## Sending from a controller

```ts
// app/controllers/passwords_controller.ts
import notifications from '@rikology/adonisjs-notifications/services/main'
import PasswordChanged from '#notifications/password_changed'

export default class PasswordsController {
  async update({ request, auth }: HttpContext) {
    const user = await auth.getUserOrFail()
    const newPassword = request.input('password')

    user.password = await hash.make(newPassword)
    await user.save()

    await notifications.sendNow(user, new PasswordChanged(new Date()))

    return { message: 'Password updated' }
  }
}
```

## Key points

- Uses `sendNow()` because security notifications should not be delayed
- Sets `priority = 'critical'` to bypass quiet hours
- Single channel (`mail`) — no database inbox for this one
- High email priority ensures delivery speed

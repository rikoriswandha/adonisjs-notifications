import app from '@adonisjs/core/services/app'
import type { NotificationManager } from '../src/notification_manager.ts'

let notifications: NotificationManager

await app.booted(async () => {
  notifications = await app.container.make('notification.manager')
})

export { notifications as default }

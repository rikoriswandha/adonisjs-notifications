import type { ApplicationService } from '@adonisjs/core/types'
import type { NotificationConfig } from '../src/contracts/config.ts'
import { NotificationManager } from '../src/notification_manager.ts'
import { E_NOTIFICATION_CONFIG_INVALID } from '../src/exceptions/main.ts'

/**
 * Augment the AdonisJS container with the notification manager binding.
 */
declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    'notification.manager': NotificationManager
  }
}

/**
 * The notification service provider registers the NotificationManager
 * singleton in the IoC container, resolving config from
 * `config/notifications.ts`.
 */
export default class NotificationProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('notification.manager', async () => {
      const config = this.app.config.get<NotificationConfig>('notifications')
      if (!config) {
        throw new E_NOTIFICATION_CONFIG_INVALID([
          'Missing "config/notifications.ts". Run "node ace configure adonisjs-notifications"',
        ])
      }
      return new NotificationManager(config)
    })
  }
}

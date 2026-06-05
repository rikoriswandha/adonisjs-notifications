import type { ApplicationService } from '@adonisjs/core/types'
import type { NotificationConfig } from '../src/contracts/config.ts'
import type { NotificationEmitter } from '../src/contracts/events.ts'
import { NotificationManager } from '../src/notification_manager.ts'
import { E_NOTIFICATION_CONFIG_INVALID } from '../src/exceptions/main.ts'

/**
 * Augment the AdonisJS container with the notification manager binding.
 */
declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    'notification.manager': NotificationManager
    'notification.repository': import('../src/contracts/repository.ts').NotificationRepository
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

  async boot() {
    const manager = await this.app.container.make('notification.manager')

    try {
      const emitter = await this.app.container.make('emitter')

      // Create adapter that wraps Adonis emitter into NotificationEmitter interface
      const adapter: NotificationEmitter = {
        emit(event: string, payload: any) {
          ;(emitter as any).emit(event, payload)
        },
      }
      manager.setEmitter(adapter)
    } catch (error) {
      // Emitter is optional - if not available, manager will work without events
    }
    // Attempt to wire queue support if @adonisjs/queue is installed
    try {
      const { SendNotificationJob } = await import('../src/jobs/send_notification_job.ts')
      const { setContainer } = await import('../src/jobs/send_notification_job.ts')
      setContainer(this.app.container)
      const config = this.app.config.get<NotificationConfig>('notifications')
      manager.setQueueDispatcher({
        async dispatch(payload: any) {
          const builder = SendNotificationJob.dispatch(payload)

          if (payload.queue) {
            builder.toQueue(payload.queue)
          } else {
            builder.toQueue(config.queue.defaultQueue)
          }
          if (payload.connection) {
            builder.with(payload.connection)
          }
          if (payload.delay) {
            builder.in(payload.delay)
          }
          await builder
        },
      })
    } catch {
      // @adonisjs/queue not installed — queue features unavailable
    }
    // Attempt to register NotificationRepository if Lucid is available
    try {
      await import('@adonisjs/lucid')
      const { LucidNotificationRepository } =
        await import('../src/repositories/lucid_notification_repository.ts')
      const repo = new LucidNotificationRepository()
      this.app.container.singleton('notification.repository', () => repo)
      manager.setRepository(repo)
    } catch {
      // Lucid not installed - repository binding not available
    }
  }
}

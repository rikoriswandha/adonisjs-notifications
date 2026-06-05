import type { NotificationChannelFactory } from '../contracts/config.ts'

/**
 * Channel factory namespace.
 * Each factory returns a function that lazily loads the channel implementation
 * to avoid eagerly requiring optional peer dependencies.
 */
export const channels = {
  /**
   * Mail channel factory.
   * Requires @adonisjs/mail peer dependency.
   */
  mail(options?: { mailService?: any }): NotificationChannelFactory {
    // Exception: Optional peer dependency - static import would require @adonisjs/mail
    return async () => {
      const { MailChannel } = await import('./mail_channel.ts')
      return new MailChannel(options)
    }
  },

  /**
   * Database channel factory.
   * Requires @adonisjs/lucid peer dependency.
   */
  database(options?: { repository?: any }): NotificationChannelFactory {
    // Exception: Optional peer dependency - static import would require @adonisjs/lucid
    return async () => {
      let repository = options?.repository

      // If no repository provided, create Lucid-backed repository
      if (!repository) {
        const { LucidNotificationRepository } =
          await import('../repositories/lucid_notification_repository.ts')
        repository = new LucidNotificationRepository()
      }

      const { DatabaseChannel } = await import('./database_channel.ts')
      return new DatabaseChannel(repository)
    }
  },

  /**
   * Log channel factory.
   * No external dependencies.
   * Accepts optional logger for testing (defaults to AdonisJS Pino logger).
   */
  log(): NotificationChannelFactory {
    // Exception: Lazy loading pattern for consistency with other channel factories
    return async () => {
      const { LogChannel } = await import('./log_channel.ts')
      return new LogChannel()
    }
  },

  /**
   * Null channel factory.
   * No-op delivery for testing/development.
   */
  null(): NotificationChannelFactory {
    // Exception: Lazy loading pattern for consistency with other channel factories
    return async () => {
      const { NullChannel } = await import('./null_channel.ts')
      return new NullChannel()
    }
  },
}

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
  mail(): NotificationChannelFactory {
    // Exception: Optional peer dependency - static import would require @adonisjs/mail
    return async () => {
      const { MailChannel } = await import('./mail_channel.ts')
      return new MailChannel()
    }
  },

  /**
   * Database channel factory.
   * Requires @adonisjs/lucid peer dependency.
   */
  database(): NotificationChannelFactory {
    // Exception: Optional peer dependency - static import would require @adonisjs/lucid
    return async () => {
      const { DatabaseChannel } = await import('./database_channel.ts')
      return new DatabaseChannel()
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

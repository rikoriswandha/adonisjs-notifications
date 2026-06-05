import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import type { RetryOptions, RetryResult } from '../src/contracts/repository.ts'

export default class NotificationsRetryFailed extends BaseCommand {
  static commandName = 'notifications:retry-failed'
  static description = 'Retry failed notification delivery attempts'
  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'Only retry deliveries for this channel (e.g. mail)' })
  declare channel: string

  @flags.number({ description: 'Maximum number of failed deliveries to retry' })
  declare limit: number

  async run() {
    const manager = await this.app.container.make('notification.manager' as any)

    if (!manager.repository) {
      this.logger.warning('No notification repository configured. Skipping retry.')
      return
    }

    const options: RetryOptions = {}
    if (this.channel) options.channel = this.channel
    if (this.limit !== undefined) options.limit = this.limit

    const result: RetryResult = await manager.retryFailedDeliveries(options)

    this.logger.success(`Retried: ${result.retried}, Skipped: ${result.skipped}`)

    if (result.errors.length > 0) {
      this.logger.error(`${result.errors.length} error(s) during retry`)
      for (const err of result.errors) {
        this.logger.error(`  - Delivery ${err.deliveryId}: ${err.error}`)
      }
    }
  }
}

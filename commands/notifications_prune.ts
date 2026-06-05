import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Parse a human-readable duration string (e.g. "90d", "30h") into milliseconds.
 */
function parseDuration(value: string): number {
  const match = value.match(/^([0-9]+)\s*(d|h|m|s)?$/)
  if (!match) {
    throw new Error(
      `Invalid duration format: "${value}". Expected format like "90d", "30h", "15m".`
    )
  }
  const amount = Number.parseInt(match[1], 10)
  const unit = match[2] || 'd'
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }
  return amount * multipliers[unit]
}

export default class NotificationsPrune extends BaseCommand {
  static commandName = 'notifications:prune'
  static description = 'Prune old notification and delivery records from the database'
  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'Prune notifications older than this duration (e.g. 90d, 30d)' })
  declare olderThan: string

  @flags.string({ description: 'Prune failed deliveries older than this duration (e.g. 30d)' })
  declare failedOlderThan: string

  async run() {
    const manager = await this.app.container.make('notification.manager' as any)
    const repository = manager.repository

    if (!repository) {
      this.logger.warning('No notification repository configured. Skipping prune.')
      return
    }

    let totalPruned = 0

    if (this.olderThan) {
      const ms = parseDuration(this.olderThan)
      const threshold = new Date(Date.now() - ms)
      const count = await repository.prune(threshold)
      totalPruned += count
      this.logger.info(`Pruned ${count} notification(s) older than ${this.olderThan}`)
    }

    if (this.failedOlderThan) {
      const ms = parseDuration(this.failedOlderThan)
      const threshold = new Date(Date.now() - ms)
      const count = await repository.pruneDeliveries(threshold)
      totalPruned += count
      this.logger.info(`Pruned ${count} delivery record(s) older than ${this.failedOlderThan}`)
    }

    if (totalPruned === 0) {
      this.logger.info(
        'Nothing to prune. Use --older-than or --failed-older-than to specify a duration.'
      )
    } else {
      this.logger.success(`Total pruned: ${totalPruned}`)
    }
  }
}

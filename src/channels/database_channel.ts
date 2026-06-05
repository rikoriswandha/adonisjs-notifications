import type { NotificationChannel } from '../contracts/channels.ts'
import type { DeliveryContext, DeliveryResult } from '../contracts/delivery.ts'

/**
 * Database channel implementation.
 * Requires @adonisjs/lucid peer dependency.
 *
 * @note Stub implementation - full version in Phase 6
 */
export class DatabaseChannel implements NotificationChannel<any, void> {
  name = 'database'

  async send(_context: DeliveryContext<any>): Promise<DeliveryResult<void>> {
    // Stub: actual implementation requires @adonisjs/lucid
    return { success: true, status: 'sent' }
  }
}

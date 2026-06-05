import type { NotificationChannel } from '../contracts/channels.ts'
import type { DeliveryContext, DeliveryResult } from '../contracts/delivery.ts'

/**
 * Null channel implementation.
 * No-op delivery for testing and development.
 */
export class NullChannel implements NotificationChannel<any, void> {
  name = 'null'

  async send(_context: DeliveryContext<any>): Promise<DeliveryResult<void>> {
    return { success: true, status: 'sent' }
  }
}

import type { NotificationChannel } from '../contracts/channels.ts'
import type { DeliveryContext, DeliveryResult } from '../contracts/delivery.ts'

/**
 * Mail channel implementation.
 * Requires @adonisjs/mail peer dependency.
 *
 * @note Stub implementation - full version in Phase 5
 */
export class MailChannel implements NotificationChannel<any, void> {
  name = 'mail'

  async send(_context: DeliveryContext<any>): Promise<DeliveryResult<void>> {
    // Stub: actual implementation requires @adonisjs/mail
    return { success: true, status: 'sent' }
  }
}

import type { DeliveryContext, DeliveryResult } from './delivery.ts'

export interface NotificationChannel<Message = unknown, Result = unknown> {
  name: string
  resolvesOwnMessage?: boolean
  requiresRoute?: boolean
  send(context: DeliveryContext<Message>): Promise<DeliveryResult<Result>>
}

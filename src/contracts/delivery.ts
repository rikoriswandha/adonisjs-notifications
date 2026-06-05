import type { Notification } from '../notification.ts'
import type { NormalizedNotifiable } from './notifiable.ts'

export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export interface DeliveryContext<Message = unknown> {
  notification: Notification
  notifiable: NormalizedNotifiable
  channel: string
  message: Message
}

export interface DeliveryResult<Result = unknown> {
  success: boolean
  status: DeliveryStatus
  providerMessageId?: string
  result?: Result
  error?: Error
  metadata?: Record<string, unknown>
}

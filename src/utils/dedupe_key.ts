/**
 * Generate a dedupe key for queued notification delivery.
 * Format: notification_type:instanceId:notifiable_type:notifiable_id:channel
 */
export function generateDedupeKey(
  notificationType: string,
  instanceId: string,
  notifiableType: string,
  notifiableId: string | number,
  channel: string
): string {
  return `${notificationType}:${instanceId}:${notifiableType}:${notifiableId}:${channel}`
}

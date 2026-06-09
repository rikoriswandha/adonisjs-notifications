/*
|--------------------------------------------------------------------------
| Package entrypoint
|--------------------------------------------------------------------------
|
| Export values from the package entrypoint as you see fit.
|
*/

export { configure } from './configure.ts'
export { stubsRoot } from './stubs/main.ts'
export * as errors from './src/exceptions/main.ts'
export { Notification } from './src/notification.ts'
export { NotificationManager } from './src/notification_manager.ts'
export { NotificationRouter } from './src/notification_router.ts'
export { defineConfig, resolveConfig } from './src/define_config.ts'
export { channels } from './src/channels/index.ts'
export { MailMessage } from './src/messages/mail_message.ts'
export { MemoryNotificationRepository } from './src/repositories/memory_notification_repository.ts'
export {
  NOTIFICATION_SENDING,
  NOTIFICATION_SENT,
  NOTIFICATION_FAILED,
  NOTIFICATION_SKIPPED,
} from './src/contracts/events.ts'
export { withNotifications } from './src/mixins/with_notifications.ts'
export { notificationDashboardRoutes } from './src/ui/dashboard/index.ts'
export type {
  NotificationMetrics,
  DeliveryMetrics,
  InboxMetrics,
  DeliveryMetricsFilter,
} from './src/contracts/metrics.ts'

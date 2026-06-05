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
export {
  NOTIFICATION_SENDING,
  NOTIFICATION_SENT,
  NOTIFICATION_FAILED,
  NOTIFICATION_SKIPPED,
} from './src/contracts/events.ts'

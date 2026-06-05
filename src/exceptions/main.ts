import { createError } from '@adonisjs/core/exceptions'

export const E_NOTIFICATION_ROUTE_MISSING = createError<[string, string, string?]>(
  'Cannot resolve %s notification route for %s. Define routeNotificationFor%s() or configure routing in config/notifications.ts',
  'E_NOTIFICATION_ROUTE_MISSING',
  404
)

export const E_NOTIFICATION_CHANNEL_MISSING = createError<[string]>(
  'Notification channel %s is not registered. Register it in config/notifications.ts channels map',
  'E_NOTIFICATION_CHANNEL_MISSING',
  500
)

export const E_NOTIFICATION_MESSAGE_MISSING = createError<[string, string, string]>(
  'Notification class %s does not implement to%s() method required by the %s channel',
  'E_NOTIFICATION_MESSAGE_MISSING',
  500
)

export const E_NOTIFICATION_SERIALIZATION_FAILED = createError<[string]>(
  'Failed to serialize notification %s for queue delivery. Ensure constructor parameters are JSON-serializable',
  'E_NOTIFICATION_SERIALIZATION_FAILED',
  422
)

export const E_NOTIFICATION_DELIVERY_FAILED = createError<[string, string]>(
  'Delivery of %s notification through %s channel failed',
  'E_NOTIFICATION_DELIVERY_FAILED',
  500
)

export const E_NOTIFICATION_CONFIG_INVALID = createError<[string]>(
  'Invalid notification configuration: %s',
  'E_NOTIFICATION_CONFIG_INVALID',
  500
)

export const E_NOTIFICATION_MAIL_MISSING = createError<[]>(
  'The @adonisjs/mail package is required for the mail channel. Install it with: npm i @adonisjs/mail',
  'E_NOTIFICATION_MAIL_MISSING',
  500
)

export const E_NOTIFICATION_LUCID_MISSING = createError<[]>(
  'The @adonisjs/lucid package is required for the database channel. Install it with: npm i @adonisjs/lucid',
  'E_NOTIFICATION_LUCID_MISSING',
  500
)

export const E_NOTIFICATION_QUEUE_MISSING = createError<[]>(
  'The @adonisjs/queue package is required for queued notifications. Install it with: npm i @adonisjs/queue',
  'E_NOTIFICATION_QUEUE_MISSING',
  500
)

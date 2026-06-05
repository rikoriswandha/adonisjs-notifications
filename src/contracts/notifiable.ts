import type { Notification } from '../notification.ts'

export interface Notifiable {
  getNotificationId?(): string | number
  getNotificationType?(): string
  routeNotificationFor?(channel: string): unknown
}

export interface NormalizedNotifiable {
  id: string | number
  type: string
  routes: Map<string, unknown>
  original: unknown
}

export interface NotificationRouteResolver {
  resolve(notifiable: NormalizedNotifiable, channel: string): unknown
}

export interface NotificationPreferenceResolver {
  resolve(notifiable: unknown, notification: Notification): Promise<NotificationPreferences>
}

export interface NotificationPreferences {
  enabledChannels?: string[]
  disabledChannels?: string[]
  disabledCategories?: string[]
  quietHours?: {
    timezone?: string
    start?: string
    end?: string
  }
  criticalBypass?: boolean
}

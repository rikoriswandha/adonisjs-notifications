import type { NotificationPreferences } from '../contracts/notifiable.ts'
import type { NotificationPreferencesConfig } from '../contracts/config.ts'
import type { Notification } from '../notification.ts'

/**
 * Resolve preferences for a notifiable/notification pair.
 * Returns null when no resolver is configured (passthrough).
 */
export async function resolvePreferences(
  config: NotificationPreferencesConfig,
  notifiable: unknown,
  notification: Notification
): Promise<NotificationPreferences | null> {
  if (!config.resolver) {
    return null
  }
  return config.resolver.resolve(notifiable, notification)
}

export interface FilterChannelsResult {
  allowed: string[]
  skipped: Array<{ channel: string; reason: string }>
}

/**
 * Filter channel list through resolved preferences.
 * Returns the subset of channels that are enabled.
 */
export function filterChannels(
  channels: string[],
  preferences: NotificationPreferences | null,
  notification: Notification
): FilterChannelsResult {
  if (!preferences) {
    return { allowed: channels, skipped: [] }
  }

  // Category filter: if notification category is disabled, skip all channels
  if (
    preferences.disabledCategories?.length &&
    notification.category &&
    preferences.disabledCategories.includes(notification.category)
  ) {
    return {
      allowed: [],
      skipped: channels.map((channel) => ({
        channel,
        reason: 'category_disabled_by_preferences',
      })),
    }
  }

  const allowed: string[] = []
  const skipped: Array<{ channel: string; reason: string }> = []

  for (const channel of channels) {
    // enabledChannels whitelist: if set, channel must be in the list
    if (preferences.enabledChannels?.length && !preferences.enabledChannels.includes(channel)) {
      skipped.push({ channel, reason: 'channel_disabled_by_preferences' })
      continue
    }

    // disabledChannels blacklist
    if (preferences.disabledChannels?.length && preferences.disabledChannels.includes(channel)) {
      skipped.push({ channel, reason: 'channel_disabled_by_preferences' })
      continue
    }

    allowed.push(channel)
  }

  return { allowed, skipped }
}

export interface QuietHoursCheckResult {
  blocked: boolean
  reason?: string
}

/**
 * Check whether quiet hours block delivery right now.
 */
export function checkQuietHours(
  preferences: NotificationPreferences | null,
  configQuietHours: { enabled: boolean; bypassPriorities: string[] },
  notification: Notification
): QuietHoursCheckResult {
  // Master switch off
  if (!configQuietHours.enabled) {
    return { blocked: false }
  }

  // No quiet hours configured in preferences or missing start/end
  if (!preferences?.quietHours || !preferences.quietHours.start || !preferences.quietHours.end) {
    return { blocked: false }
  }

  // Bypass priority check
  if (notification.priority && configQuietHours.bypassPriorities.includes(notification.priority)) {
    return { blocked: false }
  }

  const { start, end, timezone } = preferences.quietHours
  const now = new Date()

  if (isWithinQuietHours(start, end, now, timezone)) {
    return { blocked: true, reason: 'quiet_hours' }
  }

  return { blocked: false }
}

/**
 * Check if a given time falls within a quiet-hours window.
 * Handles same-day ranges (09:00 → 17:00) and overnight ranges (22:00 → 07:00).
 */
export function isWithinQuietHours(
  start: string,
  end: string,
  now: Date,
  timezone?: string
): boolean {
  const startMinutes = parseTimeToMinutes(start)
  const endMinutes = parseTimeToMinutes(end)

  const currentMinutes = getMinutesInTimezone(now, timezone)

  if (startMinutes <= endMinutes) {
    // Same-day range (e.g., 09:00 → 17:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }

  // Overnight range (e.g., 22:00 → 07:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes
}

/**
 * Parse an "HH:mm" string into minutes since midnight.
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Get the current time in minutes since midnight, respecting the given timezone.
 * Uses Intl.DateTimeFormat for timezone conversion.
 */
function getMinutesInTimezone(date: Date, timezone?: string): number {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }

  if (timezone) {
    options.timeZone = timezone
  }

  const formatter = new Intl.DateTimeFormat('en-US', options)
  const parts = formatter.formatToParts(date)

  let hour = 0
  let minute = 0

  for (const part of parts) {
    if (part.type === 'hour') hour = Number(part.value)
    if (part.type === 'minute') minute = Number(part.value)
  }

  return hour * 60 + minute
}

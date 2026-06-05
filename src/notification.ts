export abstract class Notification {
  /**
   * Override to declare queue behavior.
   */
  declare shouldQueue: boolean
  declare queue: string | undefined
  declare connection: string | undefined
  declare category: string | undefined
  declare priority: string | undefined

  /**
   * Return the list of channel names to send through.
   * Required — must be implemented by every notification subclass.
   */
  abstract via(notifiable: unknown): string[]

  /**
   * Optional gate. Return false to skip delivery on a specific channel.
   */
  shouldSend?(notifiable: unknown, channel: string): boolean

  /**
   * Optional per-channel delay (queue-aware).
   */
  delay?(notifiable: unknown, channel: string): number | string | null

  /**
   * Optional: resolve route for a channel on behalf of this notification.
   * Checked before notifiable.routeNotificationFor.
   */
  routeNotificationFor?(channel: string, notifiable: unknown): unknown
}

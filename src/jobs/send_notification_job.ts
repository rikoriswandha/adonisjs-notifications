import { E_NOTIFICATION_SERIALIZATION_FAILED } from '../exceptions/main.ts'
import { deserializeNotification } from '../utils/serialize.ts'
import type { NotificationManager } from '../notification_manager.ts'
import type { NormalizedNotifiable } from '../contracts/notifiable.ts'

export interface SendNotificationPayload {
  notificationType: string
  notificationData: Record<string, unknown>
  notifiableType: string
  notifiableId: string | number
  channel: string
  dedupeKey: string
}

interface JobOptions {
  queue: string
  maxRetries?: number
}

interface JobDispatcher {
  toQueue(name: string): JobDispatcher
  in(delayMs: number): JobDispatcher
  with(connection: string): JobDispatcher
}

/**
 * Queue job that delivers a notification through a single channel.
 */
export class SendNotificationJob {
  static options: JobOptions = {
    queue: 'notifications',
    maxRetries: 3,
  }

  constructor(public payload: SendNotificationPayload) {}

  static dispatch(payload: SendNotificationPayload): JobDispatcher {
    return new JobBuilder(payload)
  }

  async execute() {
    const manager = (await getContainer().make('notification.manager')) as NotificationManager
    const config = manager.getConfig()

    let notification
    try {
      notification = deserializeNotification(
        this.payload.notificationType,
        this.payload.notificationData,
        config.serialization.notificationAliases
      )
    } catch {
      throw new E_NOTIFICATION_SERIALIZATION_FAILED([this.payload.notificationType])
    }

    const notifiable = await resolveNotifiable(
      this.payload.notifiableType,
      this.payload.notifiableId
    )
    await (manager as any).deliver(notifiable, notification, this.payload.channel)
  }

  async failed(error: Error) {
    throw error
  }
}

class JobBuilder implements JobDispatcher {
  private _opts: any = {}

  constructor(private payload: SendNotificationPayload) {}

  toQueue(name: string): JobDispatcher {
    this._opts.queue = name
    return this
  }

  in(delayMs: number): JobDispatcher {
    this._opts.delay = delayMs
    return this
  }

  with(connection: string): JobDispatcher {
    this._opts.connection = connection
    return this
  }

  async then(
    _onfulfilled?: ((value: unknown) => unknown | PromiseLike<unknown>) | null,
    _onrejected?: ((reason: unknown) => unknown | PromiseLike<unknown>) | null
  ): Promise<unknown> {
    const job = new SendNotificationJob(this.payload)
    return job.execute()
  }
}

let containerRef: any
export function setContainer(container: any): void {
  containerRef = container
}

function getContainer(): any {
  if (!containerRef) {
    throw new Error(
      'SendNotificationJob container not set. Ensure the notification provider has booted.'
    )
  }
  return containerRef
}

async function resolveNotifiable(type: string, id: string | number): Promise<NormalizedNotifiable> {
  try {
    const { BaseModel } = await import('@adonisjs/lucid/orm')
    const modelClass = (globalThis as any).__adonisjs_notifiable_registry?.[type] as any
    if (modelClass && modelClass.prototype instanceof BaseModel) {
      const instance = await modelClass.find(id)
      if (!instance) {
        throw new Error(`Notifiable ${type} with id ${id} not found`)
      }
      return instance.$getAttributes
        ? {
            type,
            id,
            original: instance,
            routes: new Map(),
          }
        : { type, id, original: instance, routes: new Map() }
    }
  } catch {
    // Lucid not available or model not registered — fall through
  }

  return {
    type,
    id,
    original: { id, type },
    routes: new Map(),
  }
}

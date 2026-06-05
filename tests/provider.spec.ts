import { test } from '@japa/runner'
import { join } from 'node:path'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { AppFactory } from '@adonisjs/application/factories'
import { NotificationManager } from '../src/notification_manager.ts'
import NotificationProvider from '../providers/notification_provider.ts'

test.group('NotificationProvider', (group) => {
  let tempDir: string

  group.each.setup(async () => {
    tempDir = join(process.cwd(), '.tmp', `test-${Date.now()}`)
    await mkdir(tempDir, { recursive: true })
    await mkdir(join(tempDir, 'config'), { recursive: true })
  })

  group.each.teardown(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  test('registers notification.manager binding in container', async ({ assert }) => {
    // Write config file
    await writeFile(
      join(tempDir, 'config', 'notifications.ts'),
      `export default {
        channels: {
          mail: () => ({}),
        },
        queue: { enabled: false, defaultQueue: 'notifications' },
        routing: { mail: ['email'] },
        database: { table: 'notifications', deliveriesTable: 'notification_deliveries', idStrategy: 'uuid' },
        delivery: { recordAttempts: true, failFast: false, retry: { attempts: 3, backoff: [30, 300, 900] } },
        serialization: { notificationAliases: {}, notifiableAliases: {} },
        preferences: { quietHours: { enabled: false, bypassPriorities: [] } },
      }`,
      'utf-8'
    )

    // Create app
    const app = new AppFactory().create(new URL(`file://${tempDir}/`))
    await app.init()

    // Register provider
    const provider = new NotificationProvider(app as any)
    provider.register()

    // Boot app
    await app.boot()

    // Resolve manager
    const manager = await app.container.make('notification.manager')

    assert.instanceOf(manager, NotificationManager)
  })

  test('throws error when config is missing', async ({ assert }) => {
    // Create app without config file
    const app = new AppFactory().create(new URL(`file://${tempDir}/`))
    await app.init()

    // Register provider
    const provider = new NotificationProvider(app as any)
    provider.register()

    // Boot app
    await app.boot()

    // Attempt to resolve manager should throw
    try {
      await app.container.make('notification.manager')
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.match(error.message, /Missing "config\/notifications\.ts"/)
    }
  })
})

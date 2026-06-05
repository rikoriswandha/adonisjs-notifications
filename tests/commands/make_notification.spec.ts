import { test } from '@japa/runner'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import MakeNotification from '../../commands/make_notification.ts'

function createMockCommand<T extends new (...args: any[]) => any>(
  CommandClass: T,
  props: Record<string, any>
): InstanceType<T> {
  const command = Object.create(CommandClass.prototype)
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(command, key, { value, writable: true, configurable: true })
  }
  return command
}

test.group('MakeNotification command', (group) => {
  let tempDir: string

  group.each.setup(async () => {
    tempDir = join(
      tmpdir(),
      `notification-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
    mkdirSync(tempDir, { recursive: true })
  })

  group.each.teardown(async () => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('generates a basic notification class', async ({ assert }) => {
    let writtenFile: string | null = null
    const entity = { name: 'InvoicePaid', path: '' }

    const command = createMockCommand(MakeNotification, {
      name: 'InvoicePaid',
      queued: false,
      mail: false,
      database: false,
      force: false,
      parsed: { flags: {}, args: ['InvoicePaid'], unknownFlags: {} },
      app: {
        generators: { createEntity: () => entity },
        makePath: (...parts: string[]) => join(tempDir, ...parts),
      } as any,
      createCodemods: async () =>
        ({
          overwriteExisting: false,
          makeUsingStub: async (_stubsRoot: string, _stubPath: string, data: any) => {
            writtenFile = join(
              tempDir,
              'app/notifications',
              data.entity.path,
              data.entity.name + '.ts'
            )
          },
        }) as any,
    })

    await command.run()

    assert.isNotNull(writtenFile)
    assert.include(writtenFile!, 'InvoicePaid.ts')
  })

  test('sets queued, mail, and database flags', async ({ assert }) => {
    let capturedData: any
    const entity = { name: 'WelcomeEmail', path: '' }

    const command = createMockCommand(MakeNotification, {
      name: 'WelcomeEmail',
      queued: true,
      mail: true,
      database: true,
      force: false,
      parsed: {
        flags: { queued: true, mail: true, database: true },
        args: ['WelcomeEmail'],
        unknownFlags: {},
      },
      app: {
        generators: { createEntity: () => entity },
        makePath: (...parts: string[]) => join(tempDir, ...parts),
      } as any,
      createCodemods: async () =>
        ({
          overwriteExisting: false,
          makeUsingStub: async (_stubsRoot: string, _stubPath: string, data: any) => {
            capturedData = data
          },
        }) as any,
    })

    await command.run()

    assert.isTrue(capturedData.queued)
    assert.isTrue(capturedData.mail)
    assert.isTrue(capturedData.database)
    assert.equal(capturedData.entity.name, 'WelcomeEmail')
  })

  test('handles nested path Billing/InvoicePaid', async ({ assert }) => {
    let capturedData: any
    const entity = { name: 'InvoicePaid', path: 'Billing' }

    const command = createMockCommand(MakeNotification, {
      name: 'Billing/InvoicePaid',
      queued: false,
      mail: false,
      database: false,
      force: false,
      parsed: { flags: {}, args: ['Billing/InvoicePaid'], unknownFlags: {} },
      app: {
        generators: { createEntity: () => entity },
        makePath: (...parts: string[]) => join(tempDir, ...parts),
      } as any,
      createCodemods: async () =>
        ({
          overwriteExisting: false,
          makeUsingStub: async (_stubsRoot: string, _stubPath: string, data: any) => {
            capturedData = data
          },
        }) as any,
    })

    await command.run()

    assert.equal(capturedData.entity.name, 'InvoicePaid')
    assert.equal(capturedData.entity.path, 'Billing')
  })

  test('passes force flag to codemods', async ({ assert }) => {
    const command = createMockCommand(MakeNotification, {
      name: 'TestNotification',
      queued: false,
      mail: false,
      database: false,
      force: true,
      parsed: { flags: { force: true }, args: ['TestNotification'], unknownFlags: {} },
      app: {
        generators: { createEntity: () => ({ name: 'TestNotification', path: '' }) },
        makePath: (...parts: string[]) => join(tempDir, ...parts),
      } as any,
      createCodemods: async () =>
        ({
          overwriteExisting: true,
          makeUsingStub: async () => {},
        }) as any,
    })

    await command.run()
    assert.isTrue(command.force)
  })
})

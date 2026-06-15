import { test } from '@japa/runner'
import type { CommandMetaData } from '@adonisjs/ace/types'
import { getMetaData, getCommand } from '../../commands/main.ts'

test.group('Commands loader', () => {
  test('exports getMetaData with all commands', async ({ assert }) => {
    const meta = await getMetaData()
    const names = meta.map((command) => command.commandName).sort()

    assert.deepEqual(names, [
      'make:notification',
      'notifications:prune',
      'notifications:retry-failed',
    ])
  })

  test('getCommand returns command constructor for known command', async ({ assert }) => {
    const meta = await getMetaData()
    const makeCommand = meta.find((command) => command.commandName === 'make:notification')
    const constructor = await getCommand(makeCommand!)

    assert.isDefined(constructor)
    assert.equal(constructor!.commandName, 'make:notification')
  })

  test('getCommand returns null for unknown command', async ({ assert }) => {
    // Unknown-command test requires a CommandMetaData-shaped value that will not match the manifest.
    const constructor = await getCommand({
      commandName: 'does:not:exist',
    } as unknown as CommandMetaData)

    assert.isNull(constructor)
  })
})

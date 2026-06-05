/*
|--------------------------------------------------------------------------
| Configure hook
|--------------------------------------------------------------------------
|
| The configure hook is called when someone runs "node ace configure <package>"
| command. You are free to perform any operations inside this function to
| configure the package.
|
| To make things easier, you have access to the underlying "Configure"
| instance and you can use codemods to modify the source files.
|
*/

import type Configure from '@adonisjs/core/commands/configure'
import { stubsRoot } from './stubs/main.ts'

export async function configure(command: Configure) {
  const codemods = await command.createCodemods()

  // Publish config/notifications.ts from stub
  await codemods.makeUsingStub(stubsRoot, 'config/notifications.stub', {})

  // Check if @adonisjs/lucid is installed for database migrations
  let lucidInstalled = false
  try {
    await import('@adonisjs/lucid')
    lucidInstalled = true
  } catch {
    // Lucid not installed - skip migration publishing
  }

  if (lucidInstalled) {
    // Publish notifications table migration
    await codemods.makeUsingStub(stubsRoot, 'migrations/create_notifications_table.stub', {
      tableName: 'notifications',
    })

    // Publish notification_deliveries table migration
    await codemods.makeUsingStub(
      stubsRoot,
      'migrations/create_notification_deliveries_table.stub',
      {
        tableName: 'notification_deliveries',
      }
    )
  }

  await codemods.updateRcFile((rcFile) => {
    rcFile
      .addProvider('adonisjs-notifications/notification_provider')
      .addCommand('adonisjs-notifications/commands')
  })
}

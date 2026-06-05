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

  /**
   * Step 1: Detect optional packages
   */
  let lucidInstalled = false
  let mailInstalled = false
  let queueInstalled = false

  try {
    await import('@adonisjs/lucid')
    lucidInstalled = true
  } catch {
    // Lucid not installed
  }

  try {
    // @ts-expect-error Optional peer dependency
    await import('@adonisjs/mail')
    mailInstalled = true
  } catch {
    // Mail not installed
  }

  try {
    // @ts-expect-error Optional peer dependency
    await import('@adonisjs/queue')
    queueInstalled = true
  } catch {
    // Queue not installed
  }

  /**
   * Step 2: Interactive prompts
   */
  let publishMigrations = lucidInstalled

  if (lucidInstalled && !command.parsedFlags.database) {
    publishMigrations = await command.prompt.confirm(
      'Do you want to publish database notification migrations?'
    )
  }

  if (mailInstalled) {
    command.logger.success('@adonisjs/mail detected — mail channel is ready to use')
  } else if (!command.parsedFlags.mail) {
    const installMail = await command.prompt.confirm(
      'Do you want to install @adonisjs/mail for email notifications?'
    )
    if (installMail) {
      await codemods.installPackages([{ name: '@adonisjs/mail', isDevDependency: false }])
    }
  }

  if (queueInstalled) {
    command.logger.success('@adonisjs/queue detected — queued delivery is ready to use')
  } else if (!command.parsedFlags.queue) {
    const installQueue = await command.prompt.confirm(
      'Do you want to install @adonisjs/queue for queued notifications?'
    )
    if (installQueue) {
      await codemods.installPackages([{ name: '@adonisjs/queue', isDevDependency: false }])
    }
  }

  /**
   * Step 3: Publish config stub
   */
  await codemods.makeUsingStub(stubsRoot, 'config/notifications.stub', {})

  /**
   * Step 4: Publish migrations (conditional on lucid + user choice)
   */
  if (lucidInstalled && publishMigrations) {
    const timestamp1 = Date.now()
    const timestamp2 = timestamp1 + 1

    await codemods.makeUsingStub(stubsRoot, 'migrations/create_notifications_table.stub', {
      entity: command.app.generators.createEntity('notifications'),
      migration: {
        folder: 'database/migrations',
        fileName: `${timestamp1}_create_notifications_table.ts`,
      },
    })

    await codemods.makeUsingStub(
      stubsRoot,
      'migrations/create_notification_deliveries_table.stub',
      {
        entity: command.app.generators.createEntity('notification_deliveries'),
        migration: {
          folder: 'database/migrations',
          fileName: `${timestamp2}_create_notification_deliveries_table.ts`,
        },
      }
    )
  }

  /**
   * Step 5: Update adonisrc.ts
   */
  await codemods.updateRcFile((rcFile) => {
    rcFile
      .addProvider('adonisjs-notifications/notification_provider')
      .addCommand('adonisjs-notifications/commands')
  })

  /**
   * Step 6: Log summary
   */
  command.logger.success('adonisjs-notifications configured successfully')

  command.logger.log('')
  command.logger.log('Channels: mail, database, log, null')

  if (lucidInstalled && publishMigrations) {
    command.logger.log('  • Database migrations published')
  }

  if (mailInstalled) {
    command.logger.log('  • @adonisjs/mail integration ready')
  }

  if (queueInstalled) {
    command.logger.log('  • @adonisjs/queue integration ready')
  }

  if (!lucidInstalled) {
    command.logger.warning('  • @adonisjs/lucid not detected — database channel unavailable')
    command.logger.log('    Install with: npm i @adonisjs/lucid')
  }

  if (!mailInstalled) {
    command.logger.warning('  • @adonisjs/mail not detected — mail channel unavailable')
    command.logger.log('    Install with: npm i @adonisjs/mail')
  }

  if (!queueInstalled) {
    command.logger.warning('  • @adonisjs/queue not detected — queued delivery unavailable')
    command.logger.log('    Install with: npm i @adonisjs/queue')
  }
}

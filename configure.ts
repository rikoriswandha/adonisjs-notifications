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

  // Register provider in adonisrc.ts
  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('adonisjs-notifications/notification_provider')
  })
}

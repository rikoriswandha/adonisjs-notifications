import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { stubsRoot } from '../stubs/main.ts'

export default class MakeNotification extends BaseCommand {
  static commandName = 'make:notification'
  static description = 'Make a new notification class'
  static options: CommandOptions = { allowUnknownFlags: true }

  @args.string({ description: 'Name of the notification class' })
  declare name: string

  @flags.boolean({ description: 'Generate with queue support (shouldQueue = true)', alias: 'q' })
  declare queued: boolean

  @flags.boolean({ description: 'Generate toMail() method stub', alias: 'm' })
  declare mail: boolean

  @flags.boolean({ description: 'Generate toDatabase() method stub', alias: 'd' })
  declare database: boolean

  @flags.string({ description: 'Use the contents of the given file as the generated output' })
  declare contentsFrom: string

  @flags.boolean({ description: 'Forcefully overwrite existing files' })
  declare force: boolean

  async run() {
    const codemods = await this.createCodemods()
    codemods.overwriteExisting = this.force === true
    await codemods.makeUsingStub(
      stubsRoot,
      'make/notification.stub',
      {
        flags: this.parsed.flags,
        entity: this.app.generators.createEntity(this.name),
        queued: this.queued ?? false,
        mail: this.mail ?? false,
        database: this.database ?? false,
      },
      {
        contentsFromFile: this.contentsFrom,
      }
    )
  }
}

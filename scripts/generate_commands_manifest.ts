import { writeFile } from 'node:fs/promises'
import { FsLoader } from '@adonisjs/ace'

/**
 * Generate commands/commands.json from the compiled command files.
 *
 * We exclude main.js because it is the loader entry point, not a command class.
 */
const loader = new FsLoader(new URL('../build/commands', import.meta.url).pathname, (filePath) => {
  return filePath !== 'main.js'
})

const commandsMetaData = await loader.getMetaData()
const manifest = {
  commands: commandsMetaData,
  version: 1,
}

await writeFile(
  new URL('../commands/commands.json', import.meta.url),
  JSON.stringify(manifest, null, 2)
)
console.log(`Generated commands.json with ${commandsMetaData.length} command(s)`)

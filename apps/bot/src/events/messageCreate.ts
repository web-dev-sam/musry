import type { Client } from 'discord.js'
import { PREFIX } from '@/constants'
import { commands } from '@/commands'
import { createHelpEmbed, createCommandErrorEmbed } from '@/builders/embed'

const messageCommandMap = new Map(
  [...commands.values()].flatMap((cmd) => cmd.data.aliases.map((alias) => [alias, cmd]))
)

export function register(client: Client): void {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return
    if (!message.content.startsWith(PREFIX)) return
    if (!message.guildId) return

    const input = message.content.slice(PREFIX.length).trim()
    const spaceIndex = input.indexOf(' ')
    const command = (spaceIndex === -1 ? input : input.slice(0, spaceIndex)).toLowerCase()
    const args = spaceIndex === -1 ? '' : input.slice(spaceIndex + 1).trim()

    try {
      const cmd = messageCommandMap.get(command)
      if (cmd) {
        await cmd.runFromMessage(message, args)
      } else if (command === 'help' || command === 'h') {
        await message.reply({ embeds: [createHelpEmbed()] })
      }
    } catch (error) {
      console.error(`[musry] Message command ${command} failed:`, error)
      await message.reply({ embeds: [createCommandErrorEmbed()] })
    }
  })
}

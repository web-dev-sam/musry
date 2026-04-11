import type { Client } from 'discord.js'
import { PREFIX } from '@/constants'
import { commands } from '@/commands'
import type { Command } from '@/commands'
import { createHelpEmbed, createCommandErrorEmbed } from '@/utils/embed'

// Group commands by their prefix (longest prefix first to avoid short-prefix shadowing).
// Commands without a custom prefix fall under the global PREFIX.
const prefixGroups = new Map<string, Map<string, Command>>()

for (const cmd of commands.values()) {
  const prefix = cmd.prefix ?? PREFIX
  if (!prefixGroups.has(prefix)) prefixGroups.set(prefix, new Map())
  const group = prefixGroups.get(prefix)!
  for (const alias of cmd.data.aliases) {
    group.set(alias, cmd)
  }
}

const sortedPrefixes = [...prefixGroups.keys()].sort((a, b) => b.length - a.length)

export function register(client: Client): void {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return
    if (!message.guildId) return

    for (const prefix of sortedPrefixes) {
      if (!message.content.startsWith(prefix)) continue

      const input = message.content.slice(prefix.length).trim()
      const spaceIndex = input.indexOf(' ')
      const command = (spaceIndex === -1 ? input : input.slice(0, spaceIndex)).toLowerCase()
      const args = spaceIndex === -1 ? '' : input.slice(spaceIndex + 1).trim()

      try {
        const cmdMap = prefixGroups.get(prefix)!
        const cmd = cmdMap.get(command)
        if (cmd) {
          await cmd.runFromMessage(message, args)
        } else if (prefix === PREFIX && (command === 'help' || command === 'h')) {
          await message.reply({ embeds: [createHelpEmbed()] })
        }
      } catch (error) {
        console.error(`[musry] Message command ${command} failed:`, error)
        await message.reply({ embeds: [createCommandErrorEmbed()] })
      }
      break
    }
  })
}

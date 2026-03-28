import { REST, Routes } from 'discord.js'
import { commands } from '@/commands'

const required = ['DISCORD_TOKEN', 'CLIENT_ID'] as const
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`)
    process.exit(1)
  }
}

const token = process.env.DISCORD_TOKEN!
const clientId = process.env.CLIENT_ID!
const guildId = process.env.GUILD_ID

const commandPayloads = [...commands.values()].map((cmd) => cmd.data.builder.toJSON())

const rest = new REST().setToken(token)

// Global commands take up to 1 hour to propagate
console.log(`Registering ${commandPayloads.length} global commands (up to 1 hour to appear)...`)
await rest.put(Routes.applicationCommands(clientId), { body: commandPayloads })
console.log('Global commands registered.')

if (guildId) {
  // Guild commands are instant — use this for development
  console.log(`Registering ${commandPayloads.length} commands to guild ${guildId}...`)
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandPayloads })
  console.log('Guild commands registered.')
}

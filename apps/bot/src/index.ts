import { Client, GatewayIntentBits, MessageFlags, type InteractionReplyOptions } from 'discord.js'
import { createLavalinkManager } from '@/lavalink'
import { register as registerReady } from '@/events/ready'
import { register as registerMessageCommands } from '@/events/messageCreate'
import { register as registerVoiceStateUpdate } from '@/events/voiceStateUpdate'
import { commands } from '@/commands'
import { createCommandErrorEmbed } from '@/builders/embed'

// Ensure required env vars are set
const required = ['DISCORD_TOKEN', 'CLIENT_ID'] as const
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[musry] Missing required env var: ${key}`)
    process.exit(1)
  }
}

// Create discord client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})
client.lavalink = createLavalinkManager(client)

// Required: forward raw Discord gateway payloads to Lavalink so it receives voice state updates.
client.on('raw', (data) => client.lavalink.sendRawData(data))
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  const command = commands.get(interaction.commandName)
  if (!command) return

  try {
    await command.execute(interaction)
  } catch (error) {
    console.error(`[musry] Command ${interaction.commandName} failed:`, error)
    const reply: InteractionReplyOptions = {
      embeds: [createCommandErrorEmbed()],
      flags: MessageFlags.Ephemeral,
    }
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply)
    } else {
      await interaction.reply(reply)
    }
  }
})

registerReady(client)
registerMessageCommands(client)
registerVoiceStateUpdate(client)

await client.login(process.env.DISCORD_TOKEN)

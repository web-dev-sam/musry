import type { Client, Guild } from 'discord.js'
import { EMPTY_VC_TIMEOUT_MS } from '@/constants'

const emptyVcTimers = new Map<string, ReturnType<typeof setTimeout>>()

function cancelTimer(guildId: string): void {
  const timer = emptyVcTimers.get(guildId)
  if (timer != null) {
    clearTimeout(timer)
    emptyVcTimers.delete(guildId)
  }
}

function isBotVcEmpty(guild: Guild, botVcId: string): boolean {
  return !guild.voiceStates.cache.some(
    (vs) => vs.channelId === botVcId && !vs.member?.user.bot
  )
}

export function register(client: Client): void {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    const guildId = oldState.guild.id

    // Ignore non-channel-change events (mute, deafen, stream, etc.)
    if (oldState.channelId === newState.channelId) return

    const player = client.lavalink.getPlayer(guildId)
    if (!player?.connected || !player.voiceChannelId) {
      cancelTimer(guildId)
      return
    }

    // If the bot itself moved or disconnected, cancel any pending timer
    if (oldState.id === client.user?.id) {
      cancelTimer(guildId)
      return
    }

    const botVcId = player.voiceChannelId
    const leftBotVc = oldState.channelId === botVcId
    const joinedBotVc = newState.channelId === botVcId

    if (joinedBotVc) {
      cancelTimer(guildId)
      return
    }

    if (!leftBotVc) return

    if (!isBotVcEmpty(oldState.guild, botVcId)) return

    cancelTimer(guildId)
    const timer = setTimeout(async () => {
      emptyVcTimers.delete(guildId)
      const p = client.lavalink.getPlayer(guildId)
      if (!p?.connected || !p.voiceChannelId) return
      if (!isBotVcEmpty(oldState.guild, p.voiceChannelId)) return
      console.log(`[musry] Auto-disconnecting from empty VC in guild ${guildId}`)
      await p.destroy()
    }, EMPTY_VC_TIMEOUT_MS)
    emptyVcTimers.set(guildId, timer)
  })
}

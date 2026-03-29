import type { LavalinkManager } from 'lavalink-client'
import type { GuildId, ChannelId, VoiceChannelId, UserId } from '@/utils/types'

declare module 'discord.js' {
  interface Client {
    lavalink: LavalinkManager
  }

  interface Guild {
    id: GuildId
  }

  interface BaseChannel {
    id: ChannelId
  }

  interface VoiceState {
    id: UserId
    channelId: VoiceChannelId | null
  }

  interface User {
    id: UserId
  }
}

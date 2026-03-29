import type { EmbedBuilder } from 'discord.js'

export type CommandReplyCallback = (embed: EmbedBuilder) => Promise<unknown>
export type GuildId = string & { __brand: 'GuildId' }
export type ChannelId = string & { __brand: 'ChannelId' }
export type VoiceChannelId = ChannelId & { __voiceBrand: 'VoiceChannelId' }
export type UserId = string & { __brand: 'UserId' }

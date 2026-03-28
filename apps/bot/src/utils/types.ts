import type { EmbedBuilder } from 'discord.js'

export type CommandReplyCallback = (embed: EmbedBuilder) => Promise<unknown>

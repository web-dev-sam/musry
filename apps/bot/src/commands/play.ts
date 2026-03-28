import { MessageFlags, SlashCommandBuilder } from 'discord.js'
import type { ChatInputCommandInteraction, Message, User } from 'discord.js'
import type { LavalinkManager } from 'lavalink-client'
import { BaseCommand, type CommandContext, type CommandReplyCallback } from './base'
import {
  createNotInGuildEmbed,
  createNotInVoiceChannelEmbed,
  createNotInSameVoiceChannelEmbed,
  createPlayNotFoundEmbed,
  createPlayAddedTrackEmbed,
  createPlayAddedPlaylistEmbed,
  createPlayUsageEmbed,
} from '@/builders/embed'

type PlayInput = {
  lavalink: LavalinkManager
  guildId: string
  voiceChannelId: string
  channelId: string
  query: string
  user: User
}

export class PlayCommand extends BaseCommand {
  readonly name = 'play'
  readonly description = 'Play a song or add it to the queue'
  readonly aliases = ['p']

  buildOptions(builder: SlashCommandBuilder) {
    return builder.addStringOption((o) => o.setName('query').setDescription('URL or search term').setRequired(true))
  }

  // Unreachable: both execute() and runFromMessage() are overridden.
  async handle(_ctx: CommandContext): Promise<void> { }

  private async run(input: PlayInput, reply: CommandReplyCallback, replyError: CommandReplyCallback): Promise<void> {
    let player = input.lavalink.getPlayer(input.guildId)
    if (!player) {
      player = input.lavalink.createPlayer({
        guildId: input.guildId,
        voiceChannelId: input.voiceChannelId,
        textChannelId: input.channelId,
        selfDeaf: true,
        volume: 80,
      })
    }
    if (!player.connected) await player.connect()

    const result = await player.search(input.query, input.user)
    if (!result.tracks.length) {
      await replyError(createPlayNotFoundEmbed())
      return
    }

    const isPlaylist = result.loadType === 'playlist'
    if (isPlaylist && result.playlist) {
      player.queue.add(result.tracks)
      if (!player.playing) await player.play()
      await reply(createPlayAddedPlaylistEmbed(result.playlist.name, result.tracks.length))
    } else {
      const track = result.tracks[0]!
      player.queue.add(track)
      if (!player.playing) await player.play()
      await reply(createPlayAddedTrackEmbed(track.info.title, track.info.author ?? 'Unknown'))
    }
  }

  override async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({ embeds: [createNotInGuildEmbed()], flags: MessageFlags.Ephemeral })
      return
    }
    const voiceChannel = interaction.guild?.voiceStates.cache.get(interaction.user.id)?.channel
    if (!voiceChannel) {
      await interaction.reply({ embeds: [createNotInVoiceChannelEmbed()], flags: MessageFlags.Ephemeral })
      return
    }
    const existingPlayer = interaction.client.lavalink.getPlayer(interaction.guildId)
    if (existingPlayer?.connected && existingPlayer.voiceChannelId !== voiceChannel.id) {
      await interaction.reply({ embeds: [createNotInSameVoiceChannelEmbed()], flags: MessageFlags.Ephemeral })
      return
    }
    await this.run(
      {
        lavalink: interaction.client.lavalink,
        guildId: interaction.guildId,
        voiceChannelId: voiceChannel.id,
        channelId: interaction.channelId,
        query: interaction.options.getString('query', true),
        user: interaction.user,
      },
      (embed) => interaction.reply({ embeds: [embed] }),
      (embed) => interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
    )
  }

  override async runFromMessage(message: Message, args: string): Promise<void> {
    if (!args) {
      await message.reply({ embeds: [createPlayUsageEmbed()] })
      return
    }
    const voiceChannel = message.guild?.voiceStates.cache.get(message.author.id)?.channel
    if (!voiceChannel) {
      await message.reply({ embeds: [createNotInVoiceChannelEmbed()] })
      return
    }
    const existingPlayer = message.client.lavalink.getPlayer(message.guildId!)
    if (existingPlayer?.connected && existingPlayer.voiceChannelId !== voiceChannel.id) {
      await message.reply({ embeds: [createNotInSameVoiceChannelEmbed()] })
      return
    }
    const reply: CommandReplyCallback = (embed) => message.reply({ embeds: [embed] })
    await this.run(
      {
        lavalink: message.client.lavalink,
        guildId: message.guildId!,
        voiceChannelId: voiceChannel.id,
        channelId: message.channelId,
        query: args,
        user: message.author,
      },
      reply,
      reply
    )
  }
}

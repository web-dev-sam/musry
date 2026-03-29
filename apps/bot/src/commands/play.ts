import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js'
import { BaseCommand, type CommandContext } from './base'
import {
  createPlayAddedPlaylistEmbed,
  createPlayAddedTrackEmbed,
  createPlayNotFoundEmbed,
  createPlayUsageEmbed,
} from '@/utils/embed'
import { RequireUserInVoiceChannel, RequiresSameVoiceChannelOrBotInEmpty } from '../guards/guards'
import type { VoiceChannelId } from '@/utils/types'

export class PlayCommand extends BaseCommand {
  readonly name = 'play'
  readonly description = 'Play a song or add it to the queue'
  readonly aliases = ['p']

  buildOptions(builder: SlashCommandBuilder) {
    return builder.addStringOption((o) => o.setName('query').setDescription('URL or search term').setRequired(true))
  }

  override getSlashArgs(interaction: ChatInputCommandInteraction): string {
    return interaction.options.getString('query', true)
  }

  @RequireUserInVoiceChannel
  @RequiresSameVoiceChannelOrBotInEmpty
  async handle(ctx: CommandContext): Promise<void> {
    if (!ctx.args) {
      await ctx.replyError(createPlayUsageEmbed())
      return
    }

    const voiceChannelId = ctx.userVoiceChannelId!
    let player = ctx.player
    if (!player) {
      player = ctx.client.lavalink.createPlayer({
        guildId: ctx.guildId,
        voiceChannelId,
        textChannelId: ctx.channelId,
        selfDeaf: true,
        volume: 80,
      })
    }
    if (!player.connected) {
      player.options.voiceChannelId = voiceChannelId as VoiceChannelId
      await player.connect()
    } else if (player.voiceChannelId !== voiceChannelId) {
      await player.changeVoiceState({ voiceChannelId })
    }

    const result = await player.search(ctx.args, ctx.user)
    if (!result.tracks.length) {
      await ctx.replyError(createPlayNotFoundEmbed())
      return
    }

    const isPlaylist = result.loadType === 'playlist'
    if (isPlaylist && result.playlist) {
      player.queue.add(result.tracks)
      if (!player.playing) await player.play()
      await ctx.reply(createPlayAddedPlaylistEmbed(result.playlist.name, result.tracks.length))
    } else {
      const track = result.tracks[0]!
      player.queue.add(track)
      if (!player.playing) await player.play()
      await ctx.reply(createPlayAddedTrackEmbed(track.info.title, track.info.author ?? 'Unknown'))
    }
  }
}

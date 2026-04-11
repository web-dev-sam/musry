import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js'
import { BaseCommand, type CommandContext } from './base'
import {
  createPlayNextAddedTrackEmbed,
  createPlayNextUsageEmbed,
  createPlayNotFoundEmbed,
} from '@/utils/embed'
import { RequireUserInVoiceChannel, RequiresSameVoiceChannelOrBotInEmpty } from '../guards/guards'
import { markManualPlay } from '@/lavalink'
import type { VoiceChannelId } from '@/utils/types'

export class PlayNextCommand extends BaseCommand {
  readonly name = 'playnext'
  readonly description = 'Add a song to the front of the queue'
  readonly aliases = ['pn', 'first']

  buildOptions(builder: SlashCommandBuilder) {
    return builder.addStringOption((o) =>
      o.setName('query').setDescription('URL or search term').setRequired(true)
    )
  }

  override getSlashArgs(interaction: ChatInputCommandInteraction): string {
    return interaction.options.getString('query', true)
  }

  @RequireUserInVoiceChannel
  @RequiresSameVoiceChannelOrBotInEmpty
  async handle(ctx: CommandContext): Promise<void> {
    if (!ctx.args) {
      await ctx.replyError(createPlayNextUsageEmbed())
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

    const track = result.tracks[0]!
    player.queue.add(track, 0)
    if (!player.queue.current) { markManualPlay(ctx.guildId); await player.play() }
    await ctx.reply(
      createPlayNextAddedTrackEmbed(
        track.info.title,
        track.info.author ?? 'Unknown',
        track.info.uri,
        track.info.sourceName,
      )
    )
  }
}

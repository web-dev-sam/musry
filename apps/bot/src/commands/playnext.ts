import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js'
import { BaseCommand, type CommandContext } from './base'
import {
  createPlayNextAddedPlaylistEmbed,
  createPlayNextAddedTrackEmbed,
  createPlayNextUsageEmbed,
  createPlayNotFoundEmbed,
} from '@/utils/embed'
import { RequireUserInVoiceChannel, RequiresSameVoiceChannelOrBotInEmpty } from '../guards/guards'
import { markManualPlay } from '@/lavalink'
import { resolveQuery } from '@/utils/resolve'
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

    const resolved = await resolveQuery(player, ctx.args, ctx.user)
    if (resolved.kind === 'not_found') {
      await ctx.replyError(createPlayNotFoundEmbed())
      return
    }

    if (resolved.kind === 'playlist') {
      // Insert all playlist tracks at the front, preserving their order
      for (let i = resolved.tracks.length - 1; i >= 0; i--) {
        player.queue.add(resolved.tracks[i]!, 0)
      }
      if (!player.queue.current) { markManualPlay(ctx.guildId); await player.play() }
      await ctx.reply(createPlayNextAddedPlaylistEmbed(resolved.name, resolved.tracks.length))
    } else {
      player.queue.add(resolved.track, 0)
      if (!player.queue.current) { markManualPlay(ctx.guildId); await player.play() }
      await ctx.reply(
        createPlayNextAddedTrackEmbed(
          resolved.track.info.title,
          resolved.track.info.author ?? 'Unknown',
          resolved.track.info.uri,
          resolved.track.info.sourceName,
        )
      )
    }
  }
}

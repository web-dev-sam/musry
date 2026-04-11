import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js'
import { BaseCommand, type CommandContext } from './base'
import {
  createPlayAddedPlaylistEmbed,
  createPlayAddedTrackEmbed,
  createPlayNotFoundEmbed,
  createPlayUsageEmbed,
} from '@/utils/embed'
import { RequireUserInVoiceChannel, RequiresSameVoiceChannelOrBotInEmpty } from '../guards/guards'
import { markManualPlay } from '@/lavalink'
import { resolveQuery } from '@/utils/resolve'
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

    const resolved = await resolveQuery(player, ctx.args, ctx.user)
    if (resolved.kind === 'not_found') {
      await ctx.replyError(createPlayNotFoundEmbed())
      return
    }

    if (resolved.kind === 'playlist') {
      player.queue.add(resolved.tracks)
      if (!player.queue.current) { markManualPlay(ctx.guildId); await player.play() }
      await ctx.reply(createPlayAddedPlaylistEmbed(resolved.name, resolved.tracks.length))
    } else {
      const { track } = resolved
      player.queue.add(track)
      if (!player.queue.current) { markManualPlay(ctx.guildId); await player.play() }
      await ctx.reply(createPlayAddedTrackEmbed(track.info.title, track.info.author ?? 'Unknown', track.info.uri, track.info.sourceName))
    }
  }
}

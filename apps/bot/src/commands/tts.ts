import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js'
import { BaseCommand, type CommandContext } from './base'
import { createTtsNotFoundEmbed, createTtsUsageEmbed } from '@/utils/embed'
import { MaxArgsLength, RequireUserInVoiceChannel, RequiresSameVoiceChannel } from '../guards/guards'
import { markManualPlay, setTtsRestoreState } from '@/lavalink'
import type { VoiceChannelId } from '@/utils/types'

export class TtsCommand extends BaseCommand {
  readonly name = 'tts'
  readonly description = 'Speak text in voice — pauses music, speaks, then resumes'

  buildOptions(builder: SlashCommandBuilder) {
    return builder.addStringOption((o) =>
      o.setName('text').setDescription('Text to speak').setRequired(true)
    )
  }

  override getSlashArgs(interaction: ChatInputCommandInteraction): string {
    return interaction.options.getString('text', true)
  }

  @RequireUserInVoiceChannel
  @RequiresSameVoiceChannel
  @MaxArgsLength(100)
  async handle(ctx: CommandContext): Promise<void> {
    if (!ctx.args) {
      await ctx.replyError(createTtsUsageEmbed())
      return
    }

    let player = ctx.player
    if (!player?.connected) {
      const voiceChannelId = ctx.userVoiceChannelId! as VoiceChannelId
      if (!player) {
        player = ctx.client.lavalink.createPlayer({
          guildId: ctx.guildId,
          voiceChannelId,
          textChannelId: ctx.channelId,
          selfDeaf: true,
          volume: 80,
        })
      } else {
        player.options.voiceChannelId = voiceChannelId
      }
      await player.connect()
    }

    const currentTrack = player.queue.current
    const currentPosition = player.position
    const wasPlaying = !player.paused

    const result = await player.search(`speak:${ctx.args}`, ctx.user)
    if (!result.tracks.length) {
      await ctx.replyError(createTtsNotFoundEmbed())
      return
    }

    if (currentTrack) {
      setTtsRestoreState(ctx.guildId, { track: currentTrack, position: currentPosition, wasPlaying })
    }
    markManualPlay(ctx.guildId)
    await player.play({ track: result.tracks[0] })
  }
}

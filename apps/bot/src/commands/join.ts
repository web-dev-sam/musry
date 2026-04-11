import { BaseCommand, type CommandContext } from './base'
import { createJoinEmbed, createJoinAlreadyInChannelEmbed } from '@/utils/embed'
import { RequireUserInVoiceChannel, RequiresSameVoiceChannelOrBotInEmpty } from '../guards/guards'
import type { VoiceChannelId } from '@/utils/types'

export class JoinCommand extends BaseCommand {
  readonly name = 'join'
  readonly description = 'Join your current voice channel'
  readonly aliases = ['j', 'summon']

  @RequireUserInVoiceChannel
  @RequiresSameVoiceChannelOrBotInEmpty
  async handle(ctx: CommandContext): Promise<void> {
    const voiceChannelId = ctx.userVoiceChannelId!

    if (ctx.player?.connected && ctx.player.voiceChannelId === voiceChannelId) {
      await ctx.replyError(createJoinAlreadyInChannelEmbed())
      return
    }

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
    } else {
      await player.changeVoiceState({ voiceChannelId })
    }

    await ctx.reply(createJoinEmbed())
  }
}

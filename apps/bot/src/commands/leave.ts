import { BaseCommand, type CommandContext } from './base'
import { createLeaveEmbed, createNotInSameVoiceChannelEmbed, createNotInVoiceChannelEmbed } from '@/builders/embed'

export class LeaveCommand extends BaseCommand {
  readonly name = 'leave'
  readonly description = 'Disconnect the bot from the voice channel'
  readonly aliases = ['dc', 'disconnect']

  async handle(ctx: CommandContext): Promise<void> {
    if (!ctx.player?.connected) {
      await ctx.replyError(createNotInVoiceChannelEmbed())
      return
    }
    if (ctx.userVoiceChannelId !== ctx.player.voiceChannelId) {
      await ctx.replyError(createNotInSameVoiceChannelEmbed())
      return
    }
    await ctx.player.destroy()
    await ctx.reply(createLeaveEmbed())
  }
}

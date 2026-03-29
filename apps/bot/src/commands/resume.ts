import { BaseCommand, type CommandContext } from './base'
import { createResumedEmbed, createResumeNotPausedEmbed } from '@/utils/embed'
import { RequiresSameVoiceChannel, RequireTrackPlaying } from '../guards/guards'

export class ResumeCommand extends BaseCommand {
  readonly name = 'resume'
  readonly description = 'Resume the paused track'

  @RequiresSameVoiceChannel
  @RequireTrackPlaying
  async handle(ctx: CommandContext): Promise<void> {
    const player = ctx.player!
    if (!player.paused) {
      await ctx.replyError(createResumeNotPausedEmbed())
      return
    }
    await player.resume()
    await ctx.reply(createResumedEmbed())
  }
}

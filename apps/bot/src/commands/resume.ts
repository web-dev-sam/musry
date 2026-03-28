import { BaseCommand, type CommandContext } from './base'
import { createNothingPlayingEmbed, createResumedEmbed, createResumeNotPausedEmbed } from '@/builders/embed'

export class ResumeCommand extends BaseCommand {
  readonly name = 'resume'
  readonly description = 'Resume the paused track'
  readonly requiresSameVoiceChannel = true

  async handle(ctx: CommandContext): Promise<void> {
    if (!ctx.player?.queue.current) {
      await ctx.replyError(createNothingPlayingEmbed())
      return
    }
    if (!ctx.player.paused) {
      await ctx.replyError(createResumeNotPausedEmbed())
      return
    }
    await ctx.player.resume()
    await ctx.reply(createResumedEmbed())
  }
}

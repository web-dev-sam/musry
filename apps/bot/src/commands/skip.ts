import { BaseCommand, type CommandContext } from './base'
import { createNothingPlayingEmbed, createSkipEmbed } from '@/builders/embed'

export class SkipCommand extends BaseCommand {
  readonly name = 'skip'
  readonly description = 'Skip the current track'
  readonly requiresSameVoiceChannel = true

  async handle(ctx: CommandContext): Promise<void> {
    if (!ctx.player?.queue.current) {
      await ctx.replyError(createNothingPlayingEmbed())
      return
    }
    const skipped = ctx.player.queue.current.info.title
    if (ctx.player.queue.tracks.length > 0) {
      await ctx.player.skip()
    } else {
      await ctx.player.stopPlaying(true, true)
    }
    await ctx.reply(createSkipEmbed(skipped))
  }
}

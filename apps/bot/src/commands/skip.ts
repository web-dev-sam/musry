import { BaseCommand, type CommandContext } from './base'
import { createSkipEmbed } from '@/utils/embed'
import { RequiresSameVoiceChannel, RequireTrackPlaying } from '../guards/guards'

export class SkipCommand extends BaseCommand {
  readonly name = 'skip'
  readonly description = 'Skip the current track'

  @RequiresSameVoiceChannel
  @RequireTrackPlaying
  async handle(ctx: CommandContext): Promise<void> {
    const player = ctx.player!
    const skipped = player.queue.current!.info.title
    if (player.queue.tracks.length > 0) {
      await player.skip()
    } else {
      await player.stopPlaying(true, true)
    }
    await ctx.reply(createSkipEmbed(skipped))
  }
}

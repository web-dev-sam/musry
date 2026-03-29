import { BaseCommand, type CommandContext } from './base'
import { PREFIX } from '@/constants'
import { createPauseAlreadyPausedEmbed, createPausedEmbed } from '@/utils/embed'
import { RequiresSameVoiceChannel, RequireTrackPlaying } from '../guards/guards'

export class PauseCommand extends BaseCommand {
  readonly name = 'pause'
  readonly description = 'Pause the current track'

  @RequiresSameVoiceChannel
  @RequireTrackPlaying
  async handle(ctx: CommandContext): Promise<void> {
    const resumeHint = ctx.source === 'slash' ? '/resume' : `${PREFIX}resume`
    const player = ctx.player!

    if (player.paused) {
      await ctx.replyError(createPauseAlreadyPausedEmbed(resumeHint))
      return
    }

    await player.pause()
    await ctx.reply(createPausedEmbed(resumeHint))
  }
}

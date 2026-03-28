import { BaseCommand, type CommandContext } from './base'
import { PREFIX } from '@/constants'
import { createNothingPlayingEmbed, createPauseAlreadyPausedEmbed, createPausedEmbed } from '@/builders/embed'

export class PauseCommand extends BaseCommand {
  readonly name = 'pause'
  readonly description = 'Pause the current track'
  readonly requiresSameVoiceChannel = true

  async handle(ctx: CommandContext): Promise<void> {
    const resumeHint = ctx.source === 'slash' ? '/resume' : `${PREFIX}resume`
    if (!ctx.player?.queue.current) {
      await ctx.replyError(createNothingPlayingEmbed())
      return
    }

    if (ctx.player.paused) {
      await ctx.replyError(createPauseAlreadyPausedEmbed(resumeHint))
      return
    }

    await ctx.player.pause()
    await ctx.reply(createPausedEmbed(resumeHint))
  }
}

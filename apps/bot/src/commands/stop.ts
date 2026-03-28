import { BaseCommand, type CommandContext } from './base'
import { createNothingPlayingEmbed, createStopEmbed } from '@/builders/embed'

export class StopCommand extends BaseCommand {
  readonly name = 'stop'
  readonly description = 'Stop playback and clear the queue'
  readonly requiresSameVoiceChannel = true

  async handle(ctx: CommandContext): Promise<void> {
    if (!ctx.player?.queue.current) {
      await ctx.replyError(createNothingPlayingEmbed())
      return
    }
    await ctx.player.stopPlaying(true, true)
    await ctx.reply(createStopEmbed())
  }
}

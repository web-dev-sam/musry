import { BaseCommand, type CommandContext } from './base'
import { createStopEmbed } from '@/utils/embed'
import { RequiresSameVoiceChannel, RequireTrackPlaying } from '../guards/guards'
import { cancelSleepTimer } from './sleep'

export class StopCommand extends BaseCommand {
  readonly name = 'stop'
  readonly description = 'Stop playback and clear the queue'

  @RequiresSameVoiceChannel
  @RequireTrackPlaying
  async handle(ctx: CommandContext): Promise<void> {
    cancelSleepTimer(ctx.guildId)
    await ctx.player!.stopPlaying(true, true)
    await ctx.reply(createStopEmbed())
  }
}

import { BaseCommand, type CommandContext } from './base'
import { createLeaveEmbed } from '@/utils/embed'
import { RequirePlayerConnected, RequiresSameVoiceChannel } from '../guards/guards'

export class LeaveCommand extends BaseCommand {
  readonly name = 'leave'
  readonly description = 'Disconnect the bot from the voice channel'
  readonly aliases = ['dc', 'disconnect']

  @RequirePlayerConnected
  @RequiresSameVoiceChannel
  async handle(ctx: CommandContext): Promise<void> {
    await ctx.player!.destroy()
    await ctx.reply(createLeaveEmbed())
  }
}

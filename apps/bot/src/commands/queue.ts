import { BaseCommand, type CommandContext } from './base'
import { formatDuration } from '@/utils/format'
import { createNothingPlayingEmbed, createQueueEmbed } from '@/builders/embed'

export class QueueCommand extends BaseCommand {
  readonly name = 'queue'
  readonly description = 'Show the current queue'
  readonly aliases = ['q']

  async handle(ctx: CommandContext): Promise<void> {
    if (!ctx.player?.queue.current) {
      await ctx.replyError(createNothingPlayingEmbed())
      return
    }
    const current = ctx.player.queue.current
    const upcoming = ctx.player.queue.tracks.slice(0, 10)
    await ctx.reply(
      createQueueEmbed(
        {
          title: current.info.title,
          author: current.info.author,
          position: formatDuration(ctx.player.position),
          duration: formatDuration(current.info.duration),
        },
        ctx.player.paused,
        upcoming.map((t) => ({ title: t.info.title, duration: formatDuration(t.info.duration) })),
        ctx.player.queue.tracks.length - upcoming.length
      )
    )
  }
}

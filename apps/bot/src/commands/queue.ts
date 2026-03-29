import { BaseCommand, type CommandContext } from './base'
import { formatDuration } from '@/utils/format'
import { createQueueEmbed } from '@/utils/embed'
import { RequireTrackPlaying } from '@/guards/guards'

export class QueueCommand extends BaseCommand {
  readonly name = 'queue'
  readonly description = 'Show the current queue'
  readonly aliases = ['q']

  @RequireTrackPlaying
  async handle(ctx: CommandContext): Promise<void> {
    const player = ctx.player!
    const current = player.queue.current!
    const upcoming = player.queue.tracks.slice(0, 10)
    await ctx.reply(
      createQueueEmbed(
        {
          title: current.info.title,
          author: current.info.author,
          uri: current.info.uri,
          sourceName: current.info.sourceName,
          position: formatDuration(player.position),
          duration: formatDuration(current.info.duration),
        },
        player.paused,
        upcoming.map((t) => ({ title: t.info.title, duration: formatDuration(t.info.duration) })),
        player.queue.tracks.length - upcoming.length
      )
    )
  }
}

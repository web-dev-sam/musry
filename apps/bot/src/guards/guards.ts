import { createBotNotInVoiceChannelEmbed, createNotInSameVoiceChannelEmbed, createNothingPlayingEmbed } from '@/utils/embed'
import type { CommandContext } from '../commands/base'

type HandleMethod = (ctx: CommandContext) => Promise<void>

/**
 * Rejects the command if the bot has no active, connected player in the guild.
 * Apply above `@RequiresSameVoiceChannel` when stacking — player must exist
 * before checking which channel it's in.
 */
export function RequirePlayerConnected(originalMethod: HandleMethod, _context: ClassMethodDecoratorContext) {
  return async function (this: unknown, ctx: CommandContext): Promise<void> {
    if (!ctx.player?.connected) {
      await ctx.replyError(createBotNotInVoiceChannelEmbed())
      return
    }
    return originalMethod.call(this, ctx)
  }
}

/**
 * Rejects the command if there is no track currently playing or queued as current.
 */
export function RequireTrackPlaying(originalMethod: HandleMethod, _context: ClassMethodDecoratorContext) {
  return async function (this: unknown, ctx: CommandContext): Promise<void> {
    if (!ctx.player?.queue.current) {
      await ctx.replyError(createNothingPlayingEmbed())
      return
    }
    return originalMethod.call(this, ctx)
  }
}

/**
 * Rejects the command if a player exists but the invoking user is not in the
 * same voice channel as the bot. Passes when no player exists — that case is
 * handled separately by `@RequirePlayerConnected`.
 */
export function RequiresSameVoiceChannel(originalMethod: HandleMethod, _context: ClassMethodDecoratorContext) {
  return async function (this: unknown, ctx: CommandContext): Promise<void> {
    if (ctx.player && ctx.player.voiceChannelId !== ctx.userVoiceChannelId) {
      await ctx.replyError(createNotInSameVoiceChannelEmbed())
      return
    }
    return originalMethod.call(this, ctx)
  }
}

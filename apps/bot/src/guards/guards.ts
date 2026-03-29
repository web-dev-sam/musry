import type { EmbedBuilder } from 'discord.js'
import { createBotNotInVoiceChannelEmbed, createNotInSameVoiceChannelEmbed, createNotInVoiceChannelEmbed, createNothingPlayingEmbed } from '@/utils/embed'
import type { BaseCommand, CommandContext } from '../commands/base'
import { ParsedArgs, type MessageParser } from '@/utils/parser'

type HandleMethod = (ctx: CommandContext) => Promise<void>

/**
 * Class decorator. Bridges a {@link MessageParser} across both invocation paths:
 * - Slash: extracts options from the interaction by matching parser option names and types.
 * - Message: runs the parser against the raw arg string; replies with `usageEmbed()` on failure.
 *
 * Populates `ctx.commandArgs` before `handle()` runs so the body can read typed values
 * without knowing which path was used.
 *
 * Stack above method decorators (e.g. `@RequiresSameVoiceChannel`) so args are
 * available when guards run.
 */
export function WithParser(parser: MessageParser, usageEmbed: () => EmbedBuilder) {
  return function (target: typeof BaseCommand, _context: ClassDecoratorContext): void {
    const proto = target.prototype
    const pending = new WeakMap<object, ParsedArgs>()

    const originalExecute: BaseCommand['execute'] = proto.execute
    proto.execute = async function (this: BaseCommand, interaction) {
      const values = new Map<string, number | boolean>()
      for (const opt of parser.options) {
        const value = opt.type === 'number'
          ? interaction.options.getNumber(opt.name)
          : interaction.options.getBoolean(opt.name)
        if (value != null) values.set(opt.name, value)
        else if (opt.default != null) values.set(opt.name, opt.default)
      }
      pending.set(this, new ParsedArgs(values))
      return originalExecute.call(this, interaction)
    }

    const originalRunFromMessage: BaseCommand['runFromMessage'] = proto.runFromMessage
    proto.runFromMessage = async function (this: BaseCommand, message, args) {
      const result = parser.parse(args)
      if (!result.ok) {
        await message.reply({ embeds: [usageEmbed()] })
        return
      }
      pending.set(this, result.args)
      return originalRunFromMessage.call(this, message, args)
    }

    const originalHandle: BaseCommand['handle'] = proto.handle
    proto.handle = async function (this: BaseCommand, ctx) {
      ctx.commandArgs = pending.get(this)
      pending.delete(this)
      return originalHandle.call(this, ctx)
    }
  }
}

/**
 * Rejects the command if the invoking user is not currently in any voice channel.
 */
export function RequireUserInVoiceChannel(originalMethod: HandleMethod, _context: ClassMethodDecoratorContext) {
  return async function (this: unknown, ctx: CommandContext): Promise<void> {
    if (!ctx.userVoiceChannelId) {
      await ctx.replyError(createNotInVoiceChannelEmbed())
      return
    }
    return originalMethod.call(this, ctx)
  }
}

/**
 * Rejects the command if the bot is already playing in a different voice channel
 * AND that channel still has non-bot users in it. Passes if the bot's channel is
 * empty — the user can effectively steal the bot.
 */
export function RequiresSameVoiceChannelOrBotInEmpty(originalMethod: HandleMethod, _context: ClassMethodDecoratorContext) {
  return async function (this: unknown, ctx: CommandContext): Promise<void> {
    if (ctx.player?.connected && ctx.player.voiceChannelId !== ctx.userVoiceChannelId) {
      const nonBotCount = ctx.guild?.voiceStates.cache.filter(
        (vs) => vs.channelId === ctx.player!.voiceChannelId && !vs.member?.user.bot
      ).size ?? 1
      if (nonBotCount > 0) {
        await ctx.replyError(createNotInSameVoiceChannelEmbed())
        return
      }
    }
    return originalMethod.call(this, ctx)
  }
}

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

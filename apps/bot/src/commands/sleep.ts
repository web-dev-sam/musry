import { mkdirSync, readFileSync } from 'fs'
import { writeFile } from 'fs/promises'
import { dirname } from 'path'
import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js'
import type { Client } from 'discord.js'
import type { Track, UnresolvedTrack } from 'lavalink-client'
import { BaseCommand, type CommandContext } from './base'
import {
  createSleepSetEmbed,
  createSleepStatusEmbed,
  createSleepCancelledEmbed,
  createSleepNotActiveEmbed,
  createSleepInvalidEmbed,
  createSleepReplayEmbed,
  createSleepHistoryEmbed,
  createNothingPlayingEmbed,
  createNotInVoiceChannelEmbed,
  createNotInSameVoiceChannelEmbed,
} from '@/utils/embed'
import { markManualPlay } from '@/lavalink'
import type { GuildId, VoiceChannelId } from '@/utils/types'

type SleepTimer = { timer: ReturnType<typeof setTimeout>; endsAt: number; userId: string }
type SavedState = { tracks: (Track | UnresolvedTrack)[]; durationMs: number }

const MAX_HISTORY = 10
const HISTORY_FILE = process.env.SLEEP_HISTORY_FILE ?? './data/sleep-history.json'
mkdirSync(dirname(HISTORY_FILE), { recursive: true })

function loadHistory(): Map<string, SavedState[]> {
  try {
    const raw = readFileSync(HISTORY_FILE, 'utf-8')
    return new Map(Object.entries(JSON.parse(raw) as Record<string, SavedState[]>))
  } catch {
    return new Map()
  }
}

function persistHistory(): void {
  writeFile(HISTORY_FILE, JSON.stringify(Object.fromEntries(sleepHistory))).catch((e) =>
    console.error('[musry] [sleep] Failed to persist history:', e)
  )
}

const sleepTimers = new Map<GuildId, SleepTimer>()  // one active timer per guild (shared player)
const sleepHistory = loadHistory()                   // userId → history, index 0 = most recent

function pushHistory(userId: string, state: SavedState): void {
  const history = sleepHistory.get(userId) ?? []
  history.unshift(state)
  if (history.length > MAX_HISTORY) history.pop()
  sleepHistory.set(userId, history)
  persistHistory()
}

export function cancelSleepTimer(guildId: GuildId): void {
  const entry = sleepTimers.get(guildId)
  if (entry != null) {
    clearTimeout(entry.timer)
    sleepTimers.delete(guildId)
  }
}

function startSleepTimer(client: Client, guildId: GuildId, durationMs: number, userId: string): void {
  cancelSleepTimer(guildId)
  const endsAt = Date.now() + durationMs
  const timer = setTimeout(async () => {
    sleepTimers.delete(guildId)
    const player = client.lavalink.getPlayer(guildId)
    if (player?.queue.current) {
      await player.stopPlaying(true, true)
    }
    const member = client.guilds.cache.get(guildId)?.members.cache.get(userId)
    if (member?.voice.channelId) {
      await member.voice.disconnect().catch((e) => console.error('[musry] [sleep] Failed to disconnect user:', e))
    }
  }, durationMs)
  sleepTimers.set(guildId, { timer, endsAt, userId })
}

async function replayEntry(ctx: CommandContext, saved: SavedState): Promise<void> {
  const { guildId } = ctx
  let player = ctx.player
  if (!player) {
    player = ctx.client.lavalink.createPlayer({
      guildId,
      voiceChannelId: ctx.userVoiceChannelId!,
      textChannelId: ctx.channelId,
      selfDeaf: true,
      volume: 80,
    })
  }
  if (!player.connected) {
    player.options.voiceChannelId = ctx.userVoiceChannelId as VoiceChannelId
    await player.connect()
  } else if (player.voiceChannelId !== ctx.userVoiceChannelId) {
    await player.changeVoiceState({ voiceChannelId: ctx.userVoiceChannelId })
  }
  player.queue.add(saved.tracks)
  startSleepTimer(ctx.client, guildId, saved.durationMs, ctx.user.id)
  markManualPlay(guildId)
  await player.play()
  await ctx.reply(createSleepReplayEmbed(saved.tracks.length))
}

export class SleepCommand extends BaseCommand {
  readonly name = 'sleep'
  readonly description = 'Set a sleep timer that stops music after N minutes, or replay a previous sleep queue'

  buildOptions(builder: SlashCommandBuilder) {
    return builder.addIntegerOption((o) =>
      o
        .setName('number')
        .setDescription('Minutes to sleep (if music is playing) or history entry to replay (if not)')
        .setRequired(false)
        .setMinValue(0)
    )
  }

  override getSlashArgs(interaction: ChatInputCommandInteraction): string {
    const n = interaction.options.getInteger('number')
    return n != null ? String(n) : ''
  }

  async handle(ctx: CommandContext): Promise<void> {
    const { guildId } = ctx
    const arg = ctx.args.trim().toLowerCase()
    const musicPlaying = !!ctx.player?.queue.current
    const timerEntry = sleepTimers.get(guildId)

    // ── No argument ──────────────────────────────────────────────────────────

    if (!arg) {
      // Active timer: show remaining time
      if (timerEntry) {
        const remainingMin = Math.ceil((timerEntry.endsAt - Date.now()) / 60_000)
        await ctx.reply(createSleepStatusEmbed(remainingMin))
        return
      }

      // Music playing but no timer
      if (musicPlaying) {
        await ctx.reply(createSleepNotActiveEmbed())
        return
      }

      // Nothing playing: show history or replay single entry
      const history = sleepHistory.get(ctx.user.id) ?? []
      if (history.length === 0) {
        await ctx.reply(createSleepNotActiveEmbed())
        return
      }
      if (!ctx.userVoiceChannelId) {
        await ctx.replyError(createNotInVoiceChannelEmbed())
        return
      }
      if (history.length === 1) {
        await replayEntry(ctx, history[0]!)
        return
      }
      // Multiple entries: show the list so the user can pick
      await ctx.replyError(createSleepHistoryEmbed(history))
      return
    }

    // ── Cancel ───────────────────────────────────────────────────────────────

    if (arg === 'cancel' || arg === 'off' || arg === '0') {
      if (!timerEntry) {
        await ctx.reply(createSleepNotActiveEmbed())
        return
      }
      cancelSleepTimer(guildId)
      await ctx.reply(createSleepCancelledEmbed())
      return
    }

    // ── Numeric argument ─────────────────────────────────────────────────────

    const n = parseInt(arg, 10)
    if (isNaN(n) || n < 1) {
      await ctx.replyError(createSleepInvalidEmbed())
      return
    }

    // Music playing or timer active → n = minutes, set timer
    if (musicPlaying || timerEntry) {
      if (n > 1440) {
        await ctx.replyError(createSleepInvalidEmbed())
        return
      }
      if (!musicPlaying) {
        await ctx.replyError(createNothingPlayingEmbed())
        return
      }
      if (ctx.userVoiceChannelId !== ctx.player!.voiceChannelId) {
        await ctx.replyError(createNotInSameVoiceChannelEmbed())
        return
      }
      const durationMs = n * 60_000
      const tracks: (Track | UnresolvedTrack)[] = [ctx.player!.queue.current!, ...ctx.player!.queue.tracks]
      pushHistory(ctx.user.id, { tracks, durationMs })
      startSleepTimer(ctx.client, guildId, durationMs, ctx.user.id)
      await ctx.reply(createSleepSetEmbed(n))
      return
    }

    // Nothing playing → n = history index (1-based)
    const history = sleepHistory.get(ctx.user.id) ?? []
    const entry = history[n - 1]
    if (!entry) {
      await ctx.replyError(createSleepHistoryEmbed(history))
      return
    }
    if (!ctx.userVoiceChannelId) {
      await ctx.replyError(createNotInVoiceChannelEmbed())
      return
    }
    await replayEntry(ctx, entry)
  }
}

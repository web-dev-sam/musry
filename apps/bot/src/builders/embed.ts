import { EmbedBuilder } from 'discord.js'
import { PREFIX } from '@/constants'

const RED = 0xed4245
const YELLOW = 0xfee75c
const GREEN = 0x57f287
const BLURPLE = 0x5865f2

function errorEmbed() {
  return new EmbedBuilder().setColor(RED)
}
function warnEmbed() {
  return new EmbedBuilder().setColor(YELLOW)
}
function successEmbed() {
  return new EmbedBuilder().setColor(GREEN)
}
function infoEmbed() {
  return new EmbedBuilder().setColor(BLURPLE)
}

// ── Shared ────────────────────────────────────────────────────────────────────

export function createNotInGuildEmbed(): EmbedBuilder {
  return errorEmbed().setDescription('This command can only be used in a server.')
}

export function createNotInVoiceChannelEmbed(): EmbedBuilder {
  return errorEmbed().setDescription('You need to be in a voice channel first.')
}

export function createNotInSameVoiceChannelEmbed(): EmbedBuilder {
  return errorEmbed().setDescription('You need to be in the same voice channel as the bot.')
}

export function createNothingPlayingEmbed(): EmbedBuilder {
  return errorEmbed().setDescription('Nothing is playing.')
}

export function createCommandErrorEmbed(): EmbedBuilder {
  return errorEmbed().setDescription('Something went wrong running that command.')
}

// ── Help ──────────────────────────────────────────────────────────────────────

export function createHelpEmbed(): EmbedBuilder {
  return infoEmbed()
    .setTitle('Commands')
    .setDescription(
      [
        `\`${PREFIX}play <url or search>\` — play a song or add it to the queue`,
        `\`${PREFIX}skip\` — skip the current song`,
        `\`${PREFIX}stop\` — stop playback and clear the queue`,
        `\`${PREFIX}pause\` — pause the current song`,
        `\`${PREFIX}resume\` — resume a paused song`,
        `\`${PREFIX}queue\` (or \`${PREFIX}q\`) — show the current queue`,
        `\`${PREFIX}speed <50–200> [pitch:false]\` — set playback speed and pitch (100 = normal, add \`pitch:false\` to keep original pitch)`,
        `\`${PREFIX}leave\` (or \`${PREFIX}dc\`) — disconnect the bot from voice`,
        `\`${PREFIX}help\` (or \`${PREFIX}h\`) — show this help message`,
      ].join('\n')
    )
}

// ── Play ──────────────────────────────────────────────────────────────────────

export function createPlayUsageEmbed(): EmbedBuilder {
  return errorEmbed().setDescription(`Usage: \`${PREFIX}play <url or search term>\``)
}

export function createPlayNotFoundEmbed(): EmbedBuilder {
  return errorEmbed().setDescription('Nothing found for that query.')
}

export function createPlayAddedTrackEmbed(title: string, author: string): EmbedBuilder {
  return infoEmbed()
    .setTitle('Added to Queue')
    .setDescription(`**${title}**`)
    .addFields({ name: 'By', value: author, inline: true })
}

export function createPlayAddedPlaylistEmbed(name: string, count: number): EmbedBuilder {
  return infoEmbed()
    .setTitle('Added Playlist')
    .setDescription(`**${name}**`)
    .addFields({ name: 'Tracks', value: String(count), inline: true })
}

// ── Skip ──────────────────────────────────────────────────────────────────────

export function createSkipEmbed(title: string): EmbedBuilder {
  return infoEmbed().setDescription(`Skipped **${title}**.`)
}

// ── Stop ──────────────────────────────────────────────────────────────────────

export function createStopEmbed(): EmbedBuilder {
  return infoEmbed().setDescription('Stopped playback and cleared the queue.')
}

// ── Pause ─────────────────────────────────────────────────────────────────────

export function createPausedEmbed(resumeHint: string): EmbedBuilder {
  return warnEmbed().setDescription(`Paused. Use \`${resumeHint}\` to continue.`)
}

export function createPauseAlreadyPausedEmbed(resumeHint: string): EmbedBuilder {
  return errorEmbed().setDescription(`Already paused. Use \`${resumeHint}\` to continue.`)
}

// ── Resume ────────────────────────────────────────────────────────────────────

export function createResumedEmbed(): EmbedBuilder {
  return successEmbed().setDescription('Resumed playback.')
}

export function createResumeNotPausedEmbed(): EmbedBuilder {
  return errorEmbed().setDescription('Not paused.')
}

// ── Speed ─────────────────────────────────────────────────────────────────────

export function createSpeedEmbed(displayPercent: string, pitch: boolean): EmbedBuilder {
  const note = pitch ? '' : ' (pitch unchanged)'
  return infoEmbed().setDescription(`Playback speed set to **${displayPercent}**${note}.`)
}

export function createSpeedUsageEmbed(): EmbedBuilder {
  return errorEmbed().setDescription(`Usage: \`${PREFIX}speed <50–200> [pitch:false]\``)
}

// ── Queue ─────────────────────────────────────────────────────────────────────

type QueueTrack = { title: string; duration: string }

export function createQueueEmbed(
  nowPlaying: { title: string; author: string; position: string; duration: string },
  paused: boolean,
  upcoming: QueueTrack[],
  remaining: number
): EmbedBuilder {
  const embed = infoEmbed()
    .setTitle(`Now Playing${paused ? ' (paused)' : ''}`)
    .setDescription(`**${nowPlaying.title}**\n${nowPlaying.author} · [${nowPlaying.position}/${nowPlaying.duration}]`)

  if (upcoming.length > 0) {
    const lines = upcoming.map((t, i) => `${i + 1}. ${t.title} [${t.duration}]`)
    if (remaining > 0) lines.push(`…and ${remaining} more`)
    embed.addFields({ name: 'Up Next', value: lines.join('\n') })
  }

  return embed
}

// ── Leave ─────────────────────────────────────────────────────────────────────

export function createBotNotInVoiceChannelEmbed(): EmbedBuilder {
  return errorEmbed().setDescription('The bot is not in a voice channel.')
}

export function createLeaveEmbed(): EmbedBuilder {
  return successEmbed().setDescription('Left the voice channel.')
}

// ── Fallback ──────────────────────────────────────────────────────────────────

export function createFallbackEmbed(
  originalTitle: string,
  fallbackTitle: string,
  fallbackAuthor: string
): EmbedBuilder {
  return warnEmbed()
    .setTitle('SoundCloud fallback')
    .setDescription(
      `YouTube failed for **${originalTitle}**\nPlaying instead: **${fallbackTitle}** by ${fallbackAuthor}`
    )
}

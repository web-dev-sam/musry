import { EmbedBuilder } from 'discord.js'
import { PREFIX } from '@/constants'

const PRIMARY = 0xbc96e8
const RED = 0xed4245
const YOUTUBE = 0xff1538
const SOUNDCLOUD = 0xff7400
const GRAY = 0x9e9e9e

function primaryEmbed() {
  return new EmbedBuilder().setColor(PRIMARY)
}
function errorEmbed() {
  return new EmbedBuilder().setColor(RED)
}
function sourceColor(sourceName: string | undefined): number {
  if (sourceName === 'youtube' || sourceName === 'youtubemusic') return YOUTUBE
  if (sourceName === 'soundcloud') return SOUNDCLOUD
  return GRAY
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
  return primaryEmbed()
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

export function createPlayAddedTrackEmbed(
  title: string,
  author: string,
  uri: string | undefined,
  sourceName: string | undefined
): EmbedBuilder {
  const titleText = uri ? `**[${title}](${uri})**` : `**${title}**`
  return new EmbedBuilder()
    .setColor(sourceColor(sourceName))
    .setTitle('Added to Queue')
    .setDescription(titleText)
    .addFields({ name: 'By', value: author, inline: true })
}

export function createPlayAddedPlaylistEmbed(name: string, count: number): EmbedBuilder {
  return primaryEmbed()
    .setTitle('Added Playlist')
    .setDescription(`**${name}**`)
    .addFields({ name: 'Tracks', value: String(count), inline: true })
}

// ── Skip ──────────────────────────────────────────────────────────────────────

export function createSkipEmbed(title: string): EmbedBuilder {
  return primaryEmbed().setDescription(`Skipped **${title}**.`)
}

// ── Stop ──────────────────────────────────────────────────────────────────────

export function createStopEmbed(): EmbedBuilder {
  return primaryEmbed().setDescription('Stopped playback and cleared the queue.')
}

// ── Pause ─────────────────────────────────────────────────────────────────────

export function createPausedEmbed(resumeHint: string): EmbedBuilder {
  return primaryEmbed().setDescription(`Paused. Use \`${resumeHint}\` to continue.`)
}

export function createPauseAlreadyPausedEmbed(resumeHint: string): EmbedBuilder {
  return errorEmbed().setDescription(`Already paused. Use \`${resumeHint}\` to continue.`)
}

// ── Resume ────────────────────────────────────────────────────────────────────

export function createResumedEmbed(): EmbedBuilder {
  return primaryEmbed().setDescription('Resumed playback.')
}

export function createResumeNotPausedEmbed(): EmbedBuilder {
  return errorEmbed().setDescription('Not paused.')
}

// ── Speed ─────────────────────────────────────────────────────────────────────

export function createSpeedEmbed(displayPercent: string, pitch: boolean): EmbedBuilder {
  const note = pitch ? '' : ' (pitch unchanged)'
  return primaryEmbed().setDescription(`Playback speed set to **${displayPercent}**${note}.`)
}

export function createSpeedUsageEmbed(): EmbedBuilder {
  return errorEmbed().setDescription(`Usage: \`${PREFIX}speed <50–200> [pitch:false]\``)
}

// ── Now Playing ───────────────────────────────────────────────────────────────

export function createNowPlayingEmbed(
  title: string,
  author: string,
  uri: string | undefined,
  sourceName: string | undefined
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(sourceColor(sourceName))
    .setTitle(title)
    .addFields({ name: 'By', value: author, inline: true })
  if (uri) embed.setURL(uri)
  return embed
}

// ── Queue ─────────────────────────────────────────────────────────────────────

type QueueTrack = { title: string; duration: string }

export function createQueueEmbed(
  nowPlaying: { title: string; author: string; uri: string | undefined; sourceName: string | undefined; position: string; duration: string },
  paused: boolean,
  upcoming: QueueTrack[],
  remaining: number
): EmbedBuilder {
  const titleLink = nowPlaying.uri
    ? `**[${nowPlaying.title}](${nowPlaying.uri})**`
    : `**${nowPlaying.title}**`
  const embed = new EmbedBuilder()
    .setColor(sourceColor(nowPlaying.sourceName))
    .setTitle(`Now Playing${paused ? ' (paused)' : ''}`)
    .setDescription(`${titleLink}\n${nowPlaying.author} · [${nowPlaying.position}/${nowPlaying.duration}]`)

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
  return primaryEmbed().setDescription('Left the voice channel.')
}

// ── Fallback ──────────────────────────────────────────────────────────────────

export function createFallbackEmbed(
  originalTitle: string,
  fallbackTitle: string,
  fallbackAuthor: string
): EmbedBuilder {
  return primaryEmbed()
    .setTitle('SoundCloud fallback')
    .setDescription(
      `YouTube failed for **${originalTitle}**\nPlaying instead: **${fallbackTitle}** by ${fallbackAuthor}`
    )
}

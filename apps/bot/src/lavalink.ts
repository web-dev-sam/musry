import { LavalinkManager } from 'lavalink-client'
import type { Client } from 'discord.js'
import { createFallbackEmbed, createNowPlayingEmbed } from './utils/embed'

function isYouTubeUrl(uri: string): boolean {
  return uri.includes('youtube.com/') || uri.includes('youtu.be/')
}

async function fetchYouTubeTitle(uri: string): Promise<string | null> {
  const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(uri)}&format=json`)
  if (!res.ok) return null
  const data = (await res.json()) as { title?: string }
  return data.title ?? null
}

const manualPlay = new Set<string>()

export function markManualPlay(guildId: string): void {
  manualPlay.add(guildId)
}

export function createLavalinkManager(client: Client): LavalinkManager {
  const manager = new LavalinkManager({
    nodes: [
      {
        id: 'main',
        host: process.env.LAVALINK_HOST ?? 'localhost',
        port: Number(process.env.LAVALINK_PORT ?? 2333),
        authorization: process.env.LAVALINK_PASSWORD ?? 'youshallnotpass',
        secure: process.env.LAVALINK_SECURE === 'true',
        retryDelay: 3000,
        retryAmount: 10,
      },
    ],
    sendToShard: (guildId, payload) => client.guilds.cache.get(guildId)?.shard.send(payload),
    autoSkip: true,
    playerOptions: {
      defaultSearchPlatform: 'ytsearch',
      onDisconnect: {
        autoReconnect: true,
        destroyPlayer: false,
      },
      onEmptyQueue: {
        destroyAfterMs: Number(process.env.EMPTY_QUEUE_TIMEOUT_MS ?? 300_000),
      },
    },
  })

  manager.nodeManager.on('connect', (node) => {
    console.log(`[Lavalink] Node ${node.id} connected`)
  })

  manager.nodeManager.on('disconnect', (node, reason) => {
    console.warn(`[Lavalink] Node ${node.id} disconnected:`, reason)
  })

  manager.nodeManager.on('error', (node, error) => {
    console.error(`[Lavalink] Node ${node.id} error:`, error)
  })

  manager.on('trackStart', async (player, track) => {
    console.log(`[Lavalink] Track started: "${track?.info.title}" in guild ${player.guildId}`)
    if (manualPlay.delete(player.guildId)) return
    if (!track || !player.textChannelId) return
    const channel = await client.channels.fetch(player.textChannelId).catch(() => null)
    if (channel?.isSendable()) {
      await channel
        .send({ embeds: [createNowPlayingEmbed(track.info.title, track.info.author ?? 'Unknown', track.info.uri, track.info.sourceName)] })
        .catch((e) => console.error(`[musry] Failed to send now playing embed:`, e))
    }
  })

  manager.on('trackEnd', (player, track, payload) => {
    console.log(`[Lavalink] Track ended: "${track?.info.title}" reason=${payload.reason} in guild ${player.guildId}`)
  })

  manager.on('trackStuck', (player, track, payload) => {
    console.warn(`[Lavalink] Track stuck: "${track?.info.title}" after ${payload.thresholdMs}ms in guild ${player.guildId}`)
  })

  manager.on('trackError', async (player, track, payload) => {
    console.error(`[Lavalink] Track error: "${track?.info.title}" — ${payload.exception?.message ?? payload.exception} in guild ${player.guildId}`)

    if (!track?.info.uri || !isYouTubeUrl(track.info.uri)) {
      console.log(`[musry] [SC-fallback] Not a YouTube track, skipping SoundCloud fallback`)
      return
    }

    // Snapshot the track autoSkip will land on before the async search.
    // If the player is somewhere else by the time the search completes,
    // the user manually skipped past this track — don't re-queue it.
    const expectedNext = player.queue.tracks[0]

    console.log(`[musry] [SC-fallback] YouTube failed for "${track.info.title}", fetching title via oEmbed...`)

    try {
      const title = await fetchYouTubeTitle(track.info.uri)
      if (!title) {
        console.log(`[musry] [SC-fallback] oEmbed returned no title, giving up`)
        return
      }

      console.log(`[musry] [SC-fallback] Searching SoundCloud for "${title}"...`)
      const result = await player.search(`scsearch:${title}`, undefined)

      if (!result.tracks.length) {
        console.log(`[musry] [SC-fallback] No SoundCloud results for "${title}"`)
        return
      }

      if (player.queue.current?.info.uri !== expectedNext?.info.uri) {
        console.log(`[musry] [SC-fallback] Player moved past expected track, aborting fallback`)
        return
      }

      const fallback = result.tracks[0]!
      console.log(`[musry] [SC-fallback] Found "${fallback.info.title}" — queuing`)

      player.queue.add(fallback, 0)
      if (!player.playing) await player.play()

      if (player.textChannelId) {
        const channel = await client.channels.fetch(player.textChannelId).catch(() => null)
        if (channel?.isSendable()) {
          await channel
            .send({
              embeds: [createFallbackEmbed(track.info.title, fallback.info.title, fallback.info.author ?? 'Unknown')],
            })
            .catch((e) => console.error(`[musry] [SC-fallback] Failed to notify channel:`, e))
        }
      }
    } catch (err) {
      console.error(`[musry] [SC-fallback] Error:`, err)
    }
  })

  manager.on('playerSocketClosed', (player, payload) => {
    console.warn(`[Lavalink] Socket closed for guild ${player.guildId}:`, payload)
  })

  return manager
}

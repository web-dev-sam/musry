import type { Player, Track, UnresolvedTrack } from 'lavalink-client'
import type { User } from 'discord.js'
import { parseSpotifyUrl, resolveSpotify } from './spotify'

type AnyTrack = Track | UnresolvedTrack

export type ResolvedResult =
  | { kind: 'not_found' }
  | { kind: 'track'; track: AnyTrack }
  | { kind: 'playlist'; name: string; tracks: AnyTrack[] }

/**
 * Resolves a user query to playable tracks:
 *
 * - Spotify track URL  → Spotify metadata → YouTube search → single Track
 * - Spotify album/playlist URL → Spotify metadata → parallel YouTube searches → Track[]
 * - Any other query → passed directly to Lavalink (URL, ytsearch:, scsearch:, etc.)
 *
 * Spotify→YouTube resolution is transparent — no fallback embed is shown. If a
 * track can't be found on YouTube it is silently skipped (the existing trackError
 * handler will try SoundCloud when it actually fails during playback).
 */
export async function resolveQuery(
  player: Player,
  query: string,
  requester: User
): Promise<ResolvedResult> {
  const spotifyInfo = parseSpotifyUrl(query)

  if (spotifyInfo) {
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

    if (clientId && clientSecret) {
      console.log(`[musry] [Spotify] Resolving ${spotifyInfo.type} ${spotifyInfo.id}`)
      const resolved = await resolveSpotify(clientId, clientSecret, spotifyInfo.type, spotifyInfo.id)

      if (resolved.kind === 'track') {
        const result = await player.search(`ytsearch:${resolved.title} ${resolved.artist}`, requester)
        if (!result.tracks.length) return { kind: 'not_found' }
        return { kind: 'track', track: result.tracks[0]! }
      }

      // album or playlist — resolve all tracks in parallel
      const results = await Promise.all(
        resolved.tracks.map(async ({ title, artist }) => {
          try {
            const r = await player.search(`ytsearch:${title} ${artist}`, requester)
            return r.tracks[0] ?? null
          } catch {
            return null
          }
        })
      )

      const tracks = results.filter((t): t is AnyTrack => t !== null)
      if (!tracks.length) return { kind: 'not_found' }
      return { kind: 'playlist', name: resolved.name, tracks }
    }

    // Spotify not configured — fall through to normal search (will likely return nothing)
    console.warn('[musry] [Spotify] SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET not set')
  }

  // Normal Lavalink search (URL, ytsearch:, scsearch:, etc.)
  const result = await player.search(query, requester)
  if (!result.tracks.length) return { kind: 'not_found' }
  if (result.loadType === 'playlist' && result.playlist) {
    return { kind: 'playlist', name: result.playlist.name, tracks: result.tracks }
  }
  return { kind: 'track', track: result.tracks[0]! }
}

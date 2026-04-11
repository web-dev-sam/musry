const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API = 'https://api.spotify.com/v1'

type CachedToken = { access_token: string; expires_at: number }

type SpotifyTrackObject = {
  name: string
  artists: Array<{ name: string }>
}

type SpotifyAlbum = {
  name: string
  tracks: { items: SpotifyTrackObject[] }
}

type SpotifyPlaylist = {
  name: string
  tracks: { items: Array<{ track: SpotifyTrackObject | null }> }
}

export type SpotifyResolved =
  | { kind: 'track'; title: string; artist: string }
  | { kind: 'collection'; name: string; tracks: Array<{ title: string; artist: string }> }

let cached: CachedToken | null = null

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  if (cached && cached.expires_at > Date.now() + 10_000) return cached.access_token

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`Spotify token request failed: ${res.status}`)

  const data = (await res.json()) as { access_token: string; expires_in: number }
  cached = { access_token: data.access_token, expires_at: Date.now() + data.expires_in * 1000 }
  return cached.access_token
}

async function apiFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${SPOTIFY_API}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Spotify API error ${res.status} for ${path}`)
  return res.json() as Promise<T>
}

export function parseSpotifyUrl(url: string): { type: 'track' | 'album' | 'playlist'; id: string } | null {
  try {
    const u = new URL(url)
    if (u.hostname !== 'open.spotify.com') return null
    const [type, id] = u.pathname.split('/').filter(Boolean) as [string?, string?]
    if ((type === 'track' || type === 'album' || type === 'playlist') && id) return { type, id }
  } catch {}
  return null
}

export async function resolveSpotify(
  clientId: string,
  clientSecret: string,
  type: 'track' | 'album' | 'playlist',
  id: string
): Promise<SpotifyResolved> {
  const token = await getToken(clientId, clientSecret)

  if (type === 'track') {
    const track = await apiFetch<SpotifyTrackObject>(`/tracks/${id}`, token)
    return { kind: 'track', title: track.name, artist: track.artists[0]?.name ?? '' }
  }

  if (type === 'album') {
    const album = await apiFetch<SpotifyAlbum>(`/albums/${id}`, token)
    return {
      kind: 'collection',
      name: album.name,
      tracks: album.tracks.items.map((t) => ({ title: t.name, artist: t.artists[0]?.name ?? '' })),
    }
  }

  // playlist
  const playlist = await apiFetch<SpotifyPlaylist>(
    `/playlists/${id}?fields=name,tracks.items(track(name,artists))`,
    token
  )
  return {
    kind: 'collection',
    name: playlist.name,
    tracks: playlist.tracks.items
      .filter((item): item is { track: SpotifyTrackObject } => item.track !== null)
      .map((item) => ({ title: item.track.name, artist: item.track.artists[0]?.name ?? '' })),
  }
}

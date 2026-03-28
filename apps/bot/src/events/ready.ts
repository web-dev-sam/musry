import type { Client } from 'discord.js'

export function register(client: Client): void {
  client.once('ready', (c) => {
    console.log(`[musry] Ready! Logged in as ${c.user.tag}`)
    client.lavalink
      .init({ id: c.user.id, username: c.user.username })
      .catch((err) => console.error('[Lavalink] Init failed:', err))
  })
}

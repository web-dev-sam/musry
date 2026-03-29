# musry

A Discord music bot backed by [Lavalink](https://github.com/lavalink-devs/Lavalink) with YouTube and SoundCloud support. Supports both slash commands and message prefix commands.

## Requirements

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Bun](https://bun.sh) (for local development only)
- A Discord bot token ([create one here](https://discord.com/developers/applications))
- A YouTube OAuth refresh token (for YouTube playback)

## Installation

### 1. Clone with submodules

```sh
git clone --recurse-submodules https://github.com/web-dev-sam/musry.git
cd musry
```

If you already cloned without `--recurse-submodules`:

```sh
git submodule update --init
```

### 2. Configure environment

```sh
cp .env.example .env
```

Fill in `.env`:

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | Yes | Your Discord bot token |
| `CLIENT_ID` | Yes | Your Discord application client ID |
| `LAVALINK_PASSWORD` | Yes | Shared secret between the bot and Lavalink — set to any strong password |
| `LAVALINK_YOUTUBE_OAUTH_TOKEN` | Yes | YouTube OAuth refresh token (enables YouTube playback) |
| `GUILD_ID` | No | If set, also registers commands instantly to this guild — useful during development |
| `LAVALINK_HOST` | No | Lavalink hostname (default: `localhost`, pre-set to `lavalink` in Docker) |
| `LAVALINK_PORT` | No | Lavalink port (default: `2333`) |
| `LAVALINK_SECURE` | No | Connect to Lavalink over TLS (default: `false`) |

### 3. Register slash commands

```sh
cd apps/bot && bun run src/register-commands.ts
```

## Running

```sh
docker compose up -d
```

This starts three services:
- **yt-cipher** — solves YouTube signature challenges
- **lavalink** — audio streaming server
- **bot** — the Discord bot

## Commands

| Command | Aliases | Description |
|---|---|---|
| `/play <query>` | `.p` | Play a song or add it to the queue |
| `/skip` | `.skip` | Skip the current track |
| `/stop` | `.stop` | Stop playback and clear the queue |
| `/pause` | `.pause` | Pause the current track |
| `/resume` | `.resume` | Resume a paused track |
| `/queue` | `.q` | Show the current queue |
| `/speed <50–200>` | `.speed` | Set playback speed (100 = normal) |

The default message prefix is `.`. Both slash commands and message commands are supported.

## Security

`LAVALINK_PASSWORD` is a shared secret used to authenticate the bot with the Lavalink server. In the default Docker Compose setup, Lavalink's port (`2333`) is only accessible within the Docker network.

However, if you ever expose port `2333` publicly (e.g. running Lavalink on a separate server with a firewall rule or reverse proxy), a weak or default password lets anyone connect to your Lavalink instance and use it to stream audio, consuming your bandwidth and server resources. Set a strong value and keep it out of version control.

## Development

Install dependencies:

```sh
bun install
```

Run the bot locally (requires Lavalink running separately or via Docker):

```sh
cd apps/bot && bun run dev
```

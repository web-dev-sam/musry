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

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Your Discord bot token |
| `CLIENT_ID` | Your Discord application client ID |
| `LAVALINK_YOUTUBE_OAUTH_TOKEN` | YouTube OAuth refresh token (enables YouTube playback) |

The remaining variables (`LAVALINK_HOST`, `LAVALINK_PORT`, etc.) are pre-filled with defaults that match the Docker setup and don't need to be changed unless you're running Lavalink separately.

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

## Development

Install dependencies:

```sh
bun install
```

Run the bot locally (requires Lavalink running separately or via Docker):

```sh
cd apps/bot && bun run dev
```

import { SlashCommandBuilder } from 'discord.js'
import { MessageFlags, type ChatInputCommandInteraction, type Client, type Guild, type Message, type SlashCommandOptionsOnlyBuilder, type User } from 'discord.js'
import type { Player } from 'lavalink-client'
import { createNotInGuildEmbed } from '@/utils/embed'
import type { ParsedArgs } from '@/utils/parser'
import type { ChannelId, CommandReplyCallback, GuildId, VoiceChannelId } from '@/utils/types'

export type { CommandReplyCallback }

/**
 * Normalised command context passed to {@link BaseCommand.handle}.
 * Abstracts over slash commands and message commands so implementations
 * don't need to know which invocation path was used.
 */
export type CommandContext = {
  /** The active Lavalink player for this guild, or `undefined` if none exists yet. */
  player: Player | undefined
  /** The Discord client. */
  client: Client
  /** The guild the command was invoked in, or `null` if not cached. */
  guild: Guild | null
  /** The guild the command was invoked in. */
  guildId: GuildId
  /** The text channel the command was sent in. */
  channelId: ChannelId
  /** The user who invoked the command. */
  user: User
  /** The voice channel the invoking user is currently in, or `undefined` if they aren't in one. */
  userVoiceChannelId: VoiceChannelId | undefined
  /** Send a normal (visible) embed reply. */
  reply: CommandReplyCallback
  /** Send an ephemeral embed reply (only visible to the invoking user). */
  replyError: CommandReplyCallback
  /** Send a plain text message to the channel without replying or embedding. */
  say: (content: string) => Promise<unknown>
  /** Raw argument string. For slash commands this is populated by {@link BaseCommand.getSlashArgs}. */
  args: string
  /** Parsed arguments populated by `@WithParser`. `undefined` for commands that don't use it. */
  commandArgs: ParsedArgs | undefined
  /** Whether the command came from a slash interaction or a message prefix. */
  source: 'slash' | 'message'
}

/**
 * Base class for all bot commands. Subclasses implement {@link handle} and the
 * framework calls it from both slash commands ({@link execute}) and message
 * prefix commands ({@link runFromMessage}).
 *
 * Lifecycle for a slash command:
 *   1. `execute` is called with the raw Discord interaction.
 *   2. Guild guard runs (rejects DMs).
 *   3. A {@link CommandContext} is assembled and forwarded to `handle`.
 *   4. Any decorators on `handle` (e.g. `@RequiresSameVoiceChannel`) run before the body.
 *
 * Lifecycle for a message command:
 *   1. `runFromMessage` is called with the message and parsed arg string.
 *   2. The same steps follow.
 *
 * To register a new command: extend this class, implement `name`,
 * `description`, and `handle`, then add the instance to the commands map.
 */
export abstract class BaseCommand {
  abstract readonly name: string
  abstract readonly description: string

  /** Extra text-command aliases. The command name itself is always included. */
  readonly aliases: string[] = []

  /**
   * Custom message prefix for this command. When set, overrides the global PREFIX.
   * The command will only respond to messages that start with this prefix.
   */
  readonly prefix?: string

  /** Whether to register this command as a Discord slash command. Defaults to true. */
  readonly slashCommand: boolean = true

  /** Override to add slash command options. Return the modified builder. */
  buildOptions(builder: SlashCommandBuilder): SlashCommandOptionsOnlyBuilder {
    return builder
  }

  /**
   * Override to extract slash command options into the `args` string on
   * {@link CommandContext}. Called by {@link execute} before assembling context.
   * Commands that read from `ctx.args` in `handle` should override this.
   */
  getSlashArgs(_interaction: ChatInputCommandInteraction): string {
    return ''
  }

  /** Returns the built slash command payload and the full alias list. */
  get data(): { builder: SlashCommandOptionsOnlyBuilder; aliases: string[] } {
    const builder = new SlashCommandBuilder().setName(this.name).setDescription(this.description)
    return {
      builder: this.buildOptions(builder),
      aliases: [this.name, ...this.aliases],
    }
  }

  /**
   * Core command logic. Called by both {@link execute} and {@link runFromMessage}
   * after all guards have passed.
   */
  abstract handle(ctx: CommandContext): Promise<void>

  /** Slash command entry point. Runs guards then calls {@link handle}. */
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({ embeds: [createNotInGuildEmbed()], flags: MessageFlags.Ephemeral })
      return
    }

    const player = interaction.client.lavalink.getPlayer(interaction.guildId)
    const userVoiceChannelId = interaction.guild?.voiceStates.cache.get(interaction.user.id)?.channel?.id as VoiceChannelId | undefined

    await this.handle({
      player,
      client: interaction.client,
      guild: interaction.guild,
      guildId: interaction.guildId as GuildId,
      channelId: interaction.channelId as ChannelId,
      user: interaction.user,
      userVoiceChannelId,
      reply: (embed) => interaction.reply({ embeds: [embed] }),
      replyError: (embed) => interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral }),
      say: (content) => interaction.channel?.isSendable() ? interaction.channel.send(content) : interaction.reply({ content }),
      args: this.getSlashArgs(interaction),
      commandArgs: undefined,
      source: 'slash',
    })
  }

  /** Message prefix entry point. Runs guards then calls {@link handle}. */
  async runFromMessage(message: Message, args: string): Promise<void> {
    const player = message.client.lavalink.getPlayer(message.guildId!)
    const userVoiceChannelId = message.guild?.voiceStates.cache.get(message.author.id)?.channel?.id as VoiceChannelId | undefined

    const reply: CommandReplyCallback = (embed) => message.reply({ embeds: [embed] })

    await this.handle({
      player,
      client: message.client,
      guild: message.guild,
      guildId: message.guildId as GuildId,
      channelId: message.channelId as ChannelId,
      user: message.author,
      userVoiceChannelId,
      reply,
      replyError: reply,
      say: (content) => message.channel.isSendable() ? message.channel.send(content) : Promise.resolve(),
      args,
      commandArgs: undefined,
      source: 'message',
    })
  }
}

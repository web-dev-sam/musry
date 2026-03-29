import { SlashCommandBuilder } from 'discord.js'
import { MessageFlags, type ChatInputCommandInteraction, type Message, type SlashCommandOptionsOnlyBuilder } from 'discord.js'
import type { Player } from 'lavalink-client'
import { createNotInGuildEmbed } from '@/utils/embed'
import type { CommandReplyCallback, GuildId, VoiceChannelId } from '@/utils/types'

export type { CommandReplyCallback }

/**
 * Normalised command context passed to {@link BaseCommand.handle}.
 * Abstracts over slash commands and message commands so implementations
 * don't need to know which invocation path was used.
 */
export type CommandContext = {
  /** The active Lavalink player for this guild, or `undefined` if none exists yet. */
  player: Player | undefined
  /** The guild the command was invoked in. */
  guildId: GuildId
  /** The voice channel the invoking user is currently in, or `undefined` if they aren't in one. */
  userVoiceChannelId: VoiceChannelId | undefined
  /** Send a normal (visible) embed reply. */
  reply: CommandReplyCallback
  /** Send an ephemeral embed reply (only visible to the invoking user). */
  replyError: CommandReplyCallback
  /** Raw argument string (empty for slash commands). */
  args: string
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

  /** Override to add slash command options. Return the modified builder. */
  buildOptions(builder: SlashCommandBuilder): SlashCommandOptionsOnlyBuilder {
    return builder
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
      guildId: interaction.guildId as GuildId,
      userVoiceChannelId,
      reply: (embed) => interaction.reply({ embeds: [embed] }),
      replyError: (embed) => interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral }),
      args: '',
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
      guildId: message.guildId as GuildId,
      userVoiceChannelId,
      reply,
      replyError: reply,
      args,
      source: 'message',
    })
  }
}

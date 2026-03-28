import { SlashCommandBuilder } from 'discord.js'
import { MessageFlags, type ChatInputCommandInteraction, type Message, type SlashCommandOptionsOnlyBuilder } from 'discord.js'
import type { Player } from 'lavalink-client'
import { createNotInGuildEmbed, createNotInSameVoiceChannelEmbed } from '@/builders/embed'
import type { CommandReplyCallback } from '@/utils/types'

export type { CommandReplyCallback }

export type CommandContext = {
  player: Player | undefined
  guildId: string
  userVoiceChannelId: string | undefined
  reply: CommandReplyCallback
  replyError: CommandReplyCallback
  args: string
  source: 'slash' | 'message'
}

export abstract class BaseCommand {
  abstract readonly name: string
  abstract readonly description: string

  /** Extra text-command aliases. The command name itself is always included. */
  readonly aliases: string[] = []

  /** When true, base class checks the user is in the same VC as the bot. */
  readonly requiresSameVoiceChannel: boolean = false

  /** Override to add slash command options. Return the modified builder. */
  buildOptions(builder: SlashCommandBuilder): SlashCommandBuilder | SlashCommandOptionsOnlyBuilder {
    return builder
  }

  get data(): { builder: SlashCommandOptionsOnlyBuilder; aliases: string[] } {
    const builder = new SlashCommandBuilder().setName(this.name).setDescription(this.description)
    return {
      builder: this.buildOptions(builder),
      aliases: [this.name, ...this.aliases],
    }
  }

  /**
   * Handle a command invocation.
   */
  abstract handle(ctx: CommandContext): Promise<void>

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({ embeds: [createNotInGuildEmbed()], flags: MessageFlags.Ephemeral })
      return
    }

    const player = interaction.client.lavalink.getPlayer(interaction.guildId)
    const userVoiceChannelId = interaction.guild?.voiceStates.cache.get(interaction.user.id)?.channel?.id

    if (this.requiresSameVoiceChannel && player && player.voiceChannelId !== userVoiceChannelId) {
      await interaction.reply({ embeds: [createNotInSameVoiceChannelEmbed()], flags: MessageFlags.Ephemeral })
      return
    }

    await this.handle({
      player,
      guildId: interaction.guildId,
      userVoiceChannelId,
      reply: (embed) => interaction.reply({ embeds: [embed] }),
      replyError: (embed) => interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral }),
      args: '',
      source: 'slash',
    })
  }

  async runFromMessage(message: Message, args: string): Promise<void> {
    const player = message.client.lavalink.getPlayer(message.guildId!)
    const userVoiceChannelId = message.guild?.voiceStates.cache.get(message.author.id)?.channel?.id

    if (this.requiresSameVoiceChannel && player && player.voiceChannelId !== userVoiceChannelId) {
      await message.reply({ embeds: [createNotInSameVoiceChannelEmbed()] })
      return
    }

    const reply: CommandReplyCallback = (embed) => message.reply({ embeds: [embed] })

    await this.handle({
      player,
      guildId: message.guildId!,
      userVoiceChannelId,
      reply,
      replyError: reply,
      args,
      source: 'message',
    })
  }
}

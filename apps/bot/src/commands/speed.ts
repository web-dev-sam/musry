import { MessageFlags, SlashCommandBuilder } from 'discord.js'
import type { ChatInputCommandInteraction, Message } from 'discord.js'
import type { Player } from 'lavalink-client'
import { BaseCommand, type CommandContext, type CommandReplyCallback } from './base'
import {
  createNotInGuildEmbed,
  createNotInSameVoiceChannelEmbed,
  createNothingPlayingEmbed,
  createSpeedEmbed,
  createSpeedUsageEmbed,
} from '@/utils/embed'
import { round } from '@/utils/math'
import { MessageParser } from '@/utils/parser'

const cliArgsParser = new MessageParser()
  .addNumberOption({ name: 'percent', positional: true, min: 50, max: 200 })
  .addNumberOption({ name: 'semitones', aliases: ['s', 'semi'] })
  .addBooleanOption({ name: 'pitch', default: true })

export class SpeedCommand extends BaseCommand {
  readonly name = 'speed'
  readonly description = 'Set playback speed (50–200). Pitch shifts with speed by default. Use 100 to reset.'
  buildOptions(builder: SlashCommandBuilder) {
    return builder
      .addIntegerOption((o) =>
        o
          .setName('percent')
          .setDescription('Playback speed as a percentage (e.g. 115)')
          .setRequired(true)
          .setMinValue(50)
          .setMaxValue(200)
      )
      .addBooleanOption((o) =>
        o.setName('pitch').setDescription('Also shift pitch with speed (default: true)').setRequired(false)
      )
  }

  // Unreachable: both execute() and runFromMessage() are overridden.
  async handle(_ctx: CommandContext): Promise<void> { }

  private async run(
    player: Player | undefined,
    percent: number,
    pitch: boolean,
    reply: CommandReplyCallback,
    replyError: CommandReplyCallback
  ): Promise<void> {
    if (!player?.queue.current) {
      await replyError(createNothingPlayingEmbed())
      return
    }
    const ratio = percent / 100
    await player.filterManager.setSpeed(ratio)
    await player.filterManager.setPitch(pitch ? ratio : 1)
    await reply(createSpeedEmbed(`${round(percent)}%`, pitch))
  }

  override async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({ embeds: [createNotInGuildEmbed()], flags: MessageFlags.Ephemeral })
      return
    }
    const player = interaction.client.lavalink.getPlayer(interaction.guildId)
    const userVcId = interaction.guild?.voiceStates.cache.get(interaction.user.id)?.channel?.id
    if (player && player.voiceChannelId !== userVcId) {
      await interaction.reply({ embeds: [createNotInSameVoiceChannelEmbed()], flags: MessageFlags.Ephemeral })
      return
    }
    const percent = interaction.options.getInteger('percent', true)
    const pitch = interaction.options.getBoolean('pitch') ?? true
    await this.run(
      player,
      percent,
      pitch,
      (embed) => interaction.reply({ embeds: [embed] }),
      (embed) => interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
    )
  }

  override async runFromMessage(message: Message, args: string): Promise<void> {
    const player = message.client.lavalink.getPlayer(message.guildId!)
    const userVcId = message.guild?.voiceStates.cache.get(message.author.id)?.channel?.id
    if (player && player.voiceChannelId !== userVcId) {
      await message.reply({ embeds: [createNotInSameVoiceChannelEmbed()] })
      return
    }
    const reply: CommandReplyCallback = (embed) => message.reply({ embeds: [embed] })

    const result = cliArgsParser.parse(args)
    if (!result.ok) {
      await reply(createSpeedUsageEmbed())
      return
    }
    const rawPercent = result.args.getNumber('percent')
    const semitones = result.args.getNumber('semitones')
    if (rawPercent == null && semitones == null) {
      await reply(createSpeedUsageEmbed())
      return
    }
    const percent = semitones != null ? Math.pow(2, semitones / 12) * 100 : rawPercent!
    if (percent < 50 || percent > 200) {
      await reply(createSpeedUsageEmbed())
      return
    }
    const pitch = result.args.getBoolean('pitch') ?? true
    await this.run(player, percent, pitch, reply, reply)
  }
}

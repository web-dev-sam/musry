import { SlashCommandBuilder } from 'discord.js'
import { BaseCommand, type CommandContext } from './base'
import { createSpeedEmbed, createSpeedUsageEmbed } from '@/utils/embed'
import { RequiresSameVoiceChannel, RequireTrackPlaying, WithParser } from '../guards/guards'
import { round } from '@/utils/math'
import { MessageParser } from '@/utils/parser'

@WithParser(
  new MessageParser()
    .addNumberOption({ name: 'percent', positional: true, min: 50, max: 200 })
    .addNumberOption({ name: 'semitones', aliases: ['s', 'semi'] })
    .addBooleanOption({ name: 'pitch', default: true }),
  createSpeedUsageEmbed
)
export class SpeedCommand extends BaseCommand {
  readonly name = 'speed'
  readonly description = 'Set playback speed (50-200). Pitch shifts with speed by default. Use 100 to reset.'

  buildOptions(builder: SlashCommandBuilder) {
    return builder
      .addNumberOption((o) =>
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

  @RequiresSameVoiceChannel
  @RequireTrackPlaying
  async handle(ctx: CommandContext): Promise<void> {
    const args = ctx.commandArgs!
    const rawPercent = args.getNumber('percent')
    const semitones = args.getNumber('semitones')
    if (rawPercent == null && semitones == null) {
      await ctx.replyError(createSpeedUsageEmbed())
      return
    }
    const player = ctx.player!
    const percent = semitones != null ? Math.pow(2, semitones / 12) * 100 : rawPercent!
    const pitch = args.getBoolean('pitch') ?? true
    const ratio = percent / 100
    await player.filterManager.setSpeed(ratio)
    await player.filterManager.setPitch(pitch ? ratio : 1)
    await ctx.reply(createSpeedEmbed(`${round(percent)}%`, pitch))
  }
}

import { BaseCommand, type CommandContext } from './base'

export class ThreeCommand extends BaseCommand {
  readonly name = 'three'
  readonly description = ':3'
  readonly aliases = ['3']
  readonly prefix = ':'
  readonly slashCommand = false

  async handle(ctx: CommandContext): Promise<void> {
    await ctx.say(':3')
  }
}

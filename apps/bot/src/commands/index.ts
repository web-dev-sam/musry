import type { ChatInputCommandInteraction, Message, SlashCommandOptionsOnlyBuilder } from 'discord.js'
import { Collection } from 'discord.js'
import { LeaveCommand } from './leave'
import { PauseCommand } from './pause'
import { PlayCommand } from './play'
import { QueueCommand } from './queue'
import { ResumeCommand } from './resume'
import { SkipCommand } from './skip'
import { SpeedCommand } from './speed'
import { StopCommand } from './stop'

export type Command = {
  data: { builder: SlashCommandOptionsOnlyBuilder; aliases: string[] }
  execute: (interaction: ChatInputCommandInteraction) => Promise<unknown>
  runFromMessage: (message: Message, args: string) => Promise<void>
}

// To add a new command: import its class and add one line here.
const registry: Command[] = [
  new PlayCommand(),
  new LeaveCommand(),
  new SkipCommand(),
  new StopCommand(),
  new PauseCommand(),
  new ResumeCommand(),
  new QueueCommand(),
  new SpeedCommand(),
]

export const commands = new Collection<string, Command>(registry.map((cmd) => [cmd.data.builder.name, cmd]))

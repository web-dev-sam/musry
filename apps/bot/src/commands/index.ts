import type { ChatInputCommandInteraction, Message, SlashCommandOptionsOnlyBuilder } from 'discord.js'
import { Collection } from 'discord.js'
import { JoinCommand } from './join'
import { LeaveCommand } from './leave'
import { PlayNextCommand } from './playnext'
import { PauseCommand } from './pause'
import { PlayCommand } from './play'
import { QueueCommand } from './queue'
import { ResumeCommand } from './resume'
import { SkipCommand } from './skip'
import { SpeedCommand } from './speed'
import { StopCommand } from './stop'
import { ThreeCommand } from './three'
import { TtsCommand } from './tts'
import { SleepCommand } from './sleep'

export type Command = {
  data: { builder: SlashCommandOptionsOnlyBuilder; aliases: string[] }
  execute: (interaction: ChatInputCommandInteraction) => Promise<unknown>
  runFromMessage: (message: Message, args: string) => Promise<void>
  /** Custom message prefix. Undefined means the global PREFIX is used. */
  prefix?: string
  /** Whether to register as a slash command. Defaults to true. */
  slashCommand?: boolean
}

// To add a new command: import its class and add one line here.
const registry: Command[] = [
  new PlayCommand(),
  new JoinCommand(),
  new PlayNextCommand(),
  new LeaveCommand(),
  new SkipCommand(),
  new StopCommand(),
  new PauseCommand(),
  new ResumeCommand(),
  new QueueCommand(),
  new SpeedCommand(),
  new ThreeCommand(),
  new TtsCommand(),
  new SleepCommand(),
]

export const commands = new Collection<string, Command>(registry.map((cmd) => [cmd.data.builder.name, cmd]))

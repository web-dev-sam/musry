class ParsedArgs {
  constructor(private values: Map<string, number | boolean>) {}

  getNumber(name: string): number | undefined {
    const v = this.values.get(name)
    return typeof v === 'number' ? v : undefined
  }

  getBoolean(name: string): boolean | undefined {
    const v = this.values.get(name)
    return typeof v === 'boolean' ? v : undefined
  }
}

export class MessageParser {
  private readonly options: AnyOption[] = []

  addNumberOption(config: NumberOptionConfig): this {
    this.options.push({ ...config, type: 'number' })
    return this
  }

  addBooleanOption(config: BooleanOptionConfig): this {
    this.options.push({ ...config, type: 'boolean' })
    return this
  }

  parse(input: string): ParseResult {
    const tokens = input.trim() ? input.trim().split(/\s+/) : []
    const values = new Map<string, number | boolean>()
    const positionals = this.options.filter((o): o is NumberOption => o.type === 'number' && !!o.positional)
    let positionalCursor = 0

    for (const token of tokens) {
      // Handle key:value options
      if (token.includes(':')) {
        const [key, raw] = token.split(':', 2) as [string, string]
        const option = this.options.find((o) => o.name === key || o.aliases?.includes(key))
        if (!option) continue
        const value = coerce(option, raw)
        if (value == null || !inRange(option, value)) {
          return { ok: false }
        }
        values.set(option.name, value)
        continue
      }

      const option = positionals[positionalCursor]
      if (!option) continue
      const value = coerce(option, token)
      if (value == null || !inRange(option, value)) {
        return { ok: false }
      }
      values.set(option.name, value)
      positionalCursor++
    }

    for (const option of this.options) {
      if (values.has(option.name)) continue
      if (option.default != null) {
        values.set(option.name, option.default)
      } else if (option.required) {
        return { ok: false }
      }
    }

    return { ok: true, args: new ParsedArgs(values) }
  }
}

function coerce(option: AnyOption, raw: string): number | boolean | undefined {
  if (option.type === 'number') {
    const n = parseFloat(raw)
    return isNaN(n) ? undefined : n
  }
  if (raw === 'true') return true
  if (raw === 'false') return false
}

function inRange(option: AnyOption, value: number | boolean): boolean {
  if (option.type === 'number' && typeof value === 'number') {
    if (option.min != null && value < option.min) return false
    if (option.max != null && value > option.max) return false
  }
  return true
}

export type ParseResult = { ok: true; args: ParsedArgs } | { ok: false }

type NumberOptionConfig = {
  name: string
  aliases?: string[]
  positional?: boolean
  required?: boolean
  default?: number
  min?: number
  max?: number
}

type BooleanOptionConfig = {
  name: string
  aliases?: string[]
  required?: boolean
  default?: boolean
}

type NumberOption = NumberOptionConfig & { readonly type: 'number' }
type BooleanOption = BooleanOptionConfig & { readonly type: 'boolean' }
type AnyOption = NumberOption | BooleanOption

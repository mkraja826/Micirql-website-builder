export function parseProviderJson(value: string): unknown {
  const trimmed = value.trim()
  const withoutThinking = trimmed.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  const candidates = [trimmed, withoutThinking]

  for (const match of withoutThinking.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    const fenced = match[1]?.trim()
    if (fenced) candidates.push(fenced)
  }

  for (const candidate of [...candidates]) {
    const envelope = extractJsonEnvelope(candidate)
    if (envelope) candidates.push(envelope)
  }

  for (const candidate of [...new Set(candidates.filter(Boolean))]) {
    try {
      return JSON.parse(candidate)
    } catch {
      // Try the next normalized candidate.
    }
  }

  throw new Error('provider_returned_invalid_json')
}

function extractJsonEnvelope(value: string): string | undefined {
  let start = -1
  const stack: string[] = []
  let inString = false
  let escaped = false

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!

    if (start < 0) {
      if (character !== '{' && character !== '[') continue
      start = index
      stack.push(character === '{' ? '}' : ']')
      continue
    }

    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (character === '\\') {
        escaped = true
        continue
      }
      if (character === '"') inString = false
      continue
    }

    if (character === '"') {
      inString = true
      continue
    }
    if (character === '{') stack.push('}')
    else if (character === '[') stack.push(']')
    else if (character === '}' || character === ']') {
      if (stack.at(-1) !== character) return undefined
      stack.pop()
      if (!stack.length) return value.slice(start, index + 1)
    }
  }

  return undefined
}

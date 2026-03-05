type ResolveFirstNameInput = {
  firstName?: string | null
  fullName?: string | null
  email?: string | null
  fallback?: string
}

function clean(value: string | null | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ')
}

export function splitFullName(value: string | null | undefined) {
  const normalized = clean(value)
  if (!normalized) {
    return { firstName: '', surname: '' }
  }

  const tokens = normalized.split(' ')
  if (tokens.length === 1) {
    return { firstName: tokens[0], surname: '' }
  }

  return {
    firstName: tokens[0],
    surname: tokens.slice(1).join(' '),
  }
}

export function combineName(firstName: string | null | undefined, surname: string | null | undefined) {
  return clean([clean(firstName), clean(surname)].filter(Boolean).join(' '))
}

export function resolveFirstName(input: ResolveFirstNameInput) {
  const firstName = clean(input.firstName)
  if (firstName) return firstName

  const fromFullName = splitFullName(input.fullName).firstName
  if (fromFullName) return fromFullName

  const localPart = clean(input.email?.split('@')[0] ?? '')
  if (localPart) {
    return localPart.replace(/[._-]+/g, ' ').trim()
  }

  return clean(input.fallback ?? 'Friend') || 'Friend'
}

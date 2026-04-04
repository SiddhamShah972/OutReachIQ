interface HunterResult {
  email: string
  confidence: string
  type: string
}

export async function findEmailWithHunter(
  domain: string,
  firstName?: string,
  lastName?: string
): Promise<HunterResult | null> {
  const apiKey = process.env.HUNTER_API_KEY
  if (!apiKey) return null

  try {
    const params = new URLSearchParams({ domain, api_key: apiKey })
    if (firstName) params.set('first_name', firstName)
    if (lastName) params.set('last_name', lastName)

    const endpoint = firstName
      ? 'https://api.hunter.io/v2/email-finder'
      : 'https://api.hunter.io/v2/domain-search'

    const response = await fetch(`${endpoint}?${params}`)
    if (!response.ok) return null

    const data = await response.json()

    if (firstName && data.data?.email) {
      return {
        email: data.data.email,
        confidence: data.data.score > 70 ? 'Verified' : 'Likely',
        type: 'personal',
      }
    }

    if (!firstName && data.data?.emails?.length > 0) {
      const topEmail = data.data.emails[0]
      return {
        email: topEmail.value,
        confidence: topEmail.confidence > 70 ? 'Verified' : 'Likely',
        type: topEmail.type,
      }
    }
  } catch {
    return null
  }

  return null
}

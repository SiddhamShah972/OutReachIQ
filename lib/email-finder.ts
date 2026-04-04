import { findEmailWithHunter } from './hunter'
import { prisma } from './prisma'

interface EmailFindResult {
  email: string
  confidence: 'Verified' | 'Likely' | 'Generic'
}

function getDomain(company: string): string {
  // Simple domain guess from company name
  return company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'
}

function generatePatternEmails(domain: string, name?: string): string[] {
  if (!name) return []
  const parts = name.split(' ')
  if (parts.length < 2) return []
  const [first, last] = parts
  const f = first.toLowerCase()
  const l = last.toLowerCase()
  return [
    `${f}@${domain}`,
    `${f}.${l}@${domain}`,
    `${f[0]}${l}@${domain}`,
    `${f}${l[0]}@${domain}`,
  ]
}

export async function findEmail(
  jobId: string,
  company: string,
  contactName?: string,
  contactDomain?: string
): Promise<EmailFindResult> {
  const domain = contactDomain || getDomain(company)

  // Layer 1: Hunter.io
  const hunterResult = await findEmailWithHunter(domain, 
    contactName?.split(' ')[0],
    contactName?.split(' ')[1]
  )
  
  if (hunterResult) {
    // Cache result
    await prisma.job.update({
      where: { id: jobId },
      data: { 
        companyEmail: hunterResult.email,
        emailConfidence: hunterResult.confidence
      }
    })
    return {
      email: hunterResult.email,
      confidence: hunterResult.confidence as 'Verified' | 'Likely' | 'Generic'
    }
  }

  // Layer 2: Pattern-based guesses
  if (contactName) {
    const patterns = generatePatternEmails(domain, contactName)
    if (patterns.length > 0) {
      const email = patterns[0]
      await prisma.job.update({
        where: { id: jobId },
        data: { companyEmail: email, emailConfidence: 'Likely' }
      })
      return { email, confidence: 'Likely' }
    }
  }

  // Layer 3: Generic fallback
  const genericEmails = [
    `careers@${domain}`,
    `jobs@${domain}`,
    `hr@${domain}`,
    `hiring@${domain}`,
  ]
  const email = genericEmails[0]
  await prisma.job.update({
    where: { id: jobId },
    data: { companyEmail: email, emailConfidence: 'Generic' }
  })
  return { email, confidence: 'Generic' }
}

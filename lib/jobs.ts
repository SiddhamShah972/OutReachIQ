import { prisma } from './prisma'
import { generateJSON, PROMPTS } from './anthropic'

interface RawJob {
  title: string
  company: string
  location?: string
  description?: string
  url?: string
  source: string
  salary?: string
  jobType?: string
  skills?: string[]
}

async function fetchAdzuna(query: string, location: string): Promise<RawJob[]> {
  const appId = process.env.ADZUNA_APP_ID
  const apiKey = process.env.ADZUNA_API_KEY
  if (!appId || !apiKey) return []

  try {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: apiKey,
      results_per_page: '20',
      what: query,
      where: location,
    })
    const resp = await fetch(`https://api.adzuna.com/v1/api/jobs/us/search/1?${params}`)
    if (!resp.ok) return []
    const data = await resp.json()
    return (data.results || []).map((j: Record<string, unknown>) => ({
      title: j.title as string,
      company: (j.company as Record<string, string>)?.display_name || '',
      location: (j.location as Record<string, string>)?.display_name,
      description: j.description as string,
      url: j.redirect_url as string,
      source: 'adzuna',
      salary: j.salary_is_predicted === '1' ? `~$${j.salary_min}-${j.salary_max}` : undefined,
    }))
  } catch {
    return []
  }
}

async function fetchRemotive(query: string): Promise<RawJob[]> {
  try {
    const resp = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=20`)
    if (!resp.ok) return []
    const data = await resp.json()
    return (data.jobs || []).map((j: Record<string, unknown>) => ({
      title: j.title as string,
      company: j.company_name as string,
      location: j.candidate_required_location as string,
      description: j.description as string,
      url: j.url as string,
      source: 'remotive',
      jobType: j.job_type as string,
      skills: (j.tags as string[]) || [],
    }))
  } catch {
    return []
  }
}

async function fetchTheMuse(query: string): Promise<RawJob[]> {
  try {
    const resp = await fetch(`https://www.themuse.com/api/public/jobs?descending=true&page=1&level=Mid%20Level&query=${encodeURIComponent(query)}`)
    if (!resp.ok) return []
    const data = await resp.json()
    return (data.results || []).map((j: Record<string, unknown>) => ({
      title: j.name as string,
      company: (j.company as Record<string, string>)?.name || '',
      location: ((j.locations as Array<Record<string, string>>) || [])[0]?.name,
      description: j.contents as string,
      url: j.refs ? (j.refs as Record<string, string>).landing_page : '',
      source: 'themuse',
      jobType: (j.type as string),
    }))
  } catch {
    return []
  }
}

async function fetchArbeitnow(): Promise<RawJob[]> {
  try {
    const resp = await fetch('https://www.arbeitnow.com/api/job-board-api')
    if (!resp.ok) return []
    const data = await resp.json()
    return (data.data || []).slice(0, 20).map((j: Record<string, unknown>) => ({
      title: j.title as string,
      company: j.company_name as string,
      location: j.location as string,
      description: j.description as string,
      url: j.url as string,
      source: 'arbeitnow',
      jobType: j.job_types ? (j.job_types as string[])[0] : undefined,
      skills: (j.tags as string[]) || [],
    }))
  } catch {
    return []
  }
}

function dedupeJobs(jobs: RawJob[]): RawJob[] {
  const seen = new Set<string>()
  return jobs.filter(job => {
    const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function fetchAndScoreJobs(
  userId: string,
  query: string,
  location: string,
  userSkills: string[],
  resumeText: string
): Promise<void> {
  // Fetch from all sources in parallel
  const [adzunaJobs, remotiveJobs, theMuseJobs, arbeitnowJobs] = await Promise.allSettled([
    fetchAdzuna(query, location),
    fetchRemotive(query),
    fetchTheMuse(query),
    fetchArbeitnow(),
  ])

  const allJobs: RawJob[] = [
    ...(adzunaJobs.status === 'fulfilled' ? adzunaJobs.value : []),
    ...(remotiveJobs.status === 'fulfilled' ? remotiveJobs.value : []),
    ...(theMuseJobs.status === 'fulfilled' ? theMuseJobs.value : []),
    ...(arbeitnowJobs.status === 'fulfilled' ? arbeitnowJobs.value : []),
  ]

  const dedupedJobs = dedupeJobs(allJobs)

  // Score in batches of 5
  const batchSize = 5
  for (let i = 0; i < dedupedJobs.length; i += batchSize) {
    const batch = dedupedJobs.slice(i, i + batchSize)
    
    await Promise.allSettled(batch.map(async (job) => {
      try {
        const scoreResult = await generateJSON<{
          score: number
          matchedSkills: string[]
          missingSkills: string[]
        }>(
          PROMPTS.matchScoring(job.title, job.description || '', userSkills, resumeText)
        )

        // Check if job already exists
        const existing = await prisma.job.findFirst({
          where: {
            userId,
            title: job.title,
            company: job.company,
          },
        })

        if (!existing) {
          await prisma.job.create({
            data: {
              userId,
              title: job.title,
              company: job.company,
              location: job.location,
              description: job.description,
              url: job.url,
              source: job.source,
              salary: job.salary,
              jobType: job.jobType,
              skills: job.skills || scoreResult.matchedSkills,
              matchScore: scoreResult.score,
              skillsGap: scoreResult.missingSkills,
            },
          })
        }
      } catch {
        // Save without scoring if AI fails
        const existing = await prisma.job.findFirst({
          where: { userId, title: job.title, company: job.company }
        })
        if (!existing) {
          await prisma.job.create({
            data: {
              userId,
              title: job.title,
              company: job.company,
              location: job.location,
              description: job.description,
              url: job.url,
              source: job.source,
              salary: job.salary,
              jobType: job.jobType,
              skills: job.skills || [],
            },
          })
        }
      }
    }))
  }
}

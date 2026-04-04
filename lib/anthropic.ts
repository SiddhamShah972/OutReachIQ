import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const MODEL = 'claude-haiku-4-5'

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: prompt }
  ]

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return content.text
}

export async function generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
  const jsonSystemPrompt = `${systemPrompt || ''}\n\nRespond with valid JSON only. No explanation, no markdown, just raw JSON.`
  
  const text = await generateText(prompt, jsonSystemPrompt)
  
  try {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text
    return JSON.parse(jsonStr.trim()) as T
  } catch {
    console.error('Failed to parse AI JSON response:', text)
    throw new Error('AI returned invalid JSON')
  }
}

export async function streamText(
  prompt: string,
  systemPrompt?: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  let fullText = ''
  
  const stream = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullText += event.delta.text
      onChunk?.(event.delta.text)
    }
  }

  return fullText
}

// Prompt templates
export const PROMPTS = {
  emailComposer: (
    name: string,
    role: string,
    company: string,
    skills: string[],
    tone: string,
    resumeHighlights: string
  ) => `
Write a cold email to ${name} at ${company} for the ${role} position.
Tone: ${tone}
My key skills: ${skills.join(', ')}
Resume highlights: ${resumeHighlights}

Return JSON: { "subject": "...", "body": "...", "subjectB": "..." }
Subject B should be an A/B test variant with different angle.
Body should be 3-4 short paragraphs, personalized and compelling.
`,

  matchScoring: (jobTitle: string, jobDescription: string, userSkills: string[], resumeText: string) => `
Score this job match on a scale of 0-100 and identify skills gap.

Job: ${jobTitle}
Description: ${jobDescription.slice(0, 1000)}
My skills: ${userSkills.join(', ')}
Resume excerpt: ${resumeText.slice(0, 500)}

Return JSON: { "score": 85, "matchedSkills": [...], "missingSkills": [...], "reasoning": "..." }
`,

  skillsGap: (jobDescription: string, userSkills: string[]) => `
Analyze skills gap for this job.
Job description: ${jobDescription.slice(0, 1000)}
Current skills: ${userSkills.join(', ')}

Return JSON: { 
  "critical": ["skill1", "skill2"],
  "niceToHave": ["skill3"],
  "timeline": "2-3 months",
  "resources": [{"skill": "...", "resource": "...", "url": "..."}]
}
`,

  companyResearch: (company: string) => `
Research ${company} for a job application context.
Return JSON: {
  "summary": "2-3 sentence company summary",
  "culture": "culture description",
  "recentNews": "recent notable news",
  "talkingPoints": ["point1", "point2", "point3"]
}
`,

  offerAnalysis: (offers: object[]) => `
Analyze these job offers and provide recommendations.
Offers: ${JSON.stringify(offers)}

Return JSON: {
  "recommendation": "best offer name",
  "reasoning": "detailed reasoning",
  "negotiationTips": ["tip1", "tip2"],
  "riskFactors": ["risk1"],
  "totalCompScore": [{"company": "...", "score": 85, "breakdown": {...}}]
}
`,

  insightEngine: (metrics: object, recentActivity: string) => `
Provide job search insights and recommendations based on this data.
Metrics: ${JSON.stringify(metrics)}
Recent activity: ${recentActivity}

Return JSON: {
  "summary": "1-2 sentence summary",
  "insights": [{"title": "...", "description": "...", "action": "..."}],
  "weeklyGoals": ["goal1", "goal2", "goal3"],
  "successProbability": 75
}
`,

  replySentiment: (emailBody: string) => `
Classify the sentiment of this email reply in the context of a job application.
Email: ${emailBody}

Return JSON: {
  "sentiment": "positive|negative|neutral|interested|rejected",
  "confidence": 0.9,
  "suggestedAction": "schedule call|send follow up|update pipeline|close",
  "summary": "brief summary"
}
`,
}

export default client

import OpenAI from 'openai'

const systemPrompt = `You are a medical emergency triage assistant.

Rules:
- Never provide a diagnosis.
- Do NOT assign severity immediately if symptoms are unclear.
- Ask 1-2 medically relevant follow-up questions when needed.
- When you have enough info, classify severity into exactly one of:
  LOW
  MODERATE
  EMERGENCY
- If EMERGENCY, instruct to call ambulance immediately.
- Provide short first aid steps if relevant.
- Keep advice under 120 words.
- Always include the disclaimer text exactly:
  "This is not a medical diagnosis."

Output JSON only (no markdown, no extra text).

If follow-up questions are needed, respond with:
{
  "followUpQuestions": ["question 1", "question 2"]
}

When enough info is gathered, respond with:
{
  "severity": "LOW | MODERATE | EMERGENCY",
  "riskScore": 0-100,
  "advice": "short response",
  "disclaimer": "This is not a medical diagnosis."
}`

let cachedClient = null

const getClient = () => {
  if (cachedClient) return cachedClient
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY.')
  }
  cachedClient = new OpenAI({ apiKey })
  return cachedClient
}

export const analyzeSymptoms = async (messages) => {
  const client = getClient()
  const response = await client.responses.create({
    model: 'gpt-4.1-mini',
    instructions: systemPrompt,
    input: messages,
  })

  return response.output_text?.trim() || ''
}

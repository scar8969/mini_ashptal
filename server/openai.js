import OpenAI from 'openai'

const systemPrompt = `You are a medical emergency triage assistant.

Rules:
- Never provide a diagnosis.
- Classify severity into exactly one of:
  LOW
  MODERATE
  EMERGENCY
- If EMERGENCY, instruct to call ambulance immediately.
- Provide short first aid steps if relevant.
- Keep response under 120 words.
- Always end with:
  'This is not a medical diagnosis.'`

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

export const analyzeSymptoms = async (userMessage) => {
  const client = getClient()
  const response = await client.responses.create({
    model: 'gpt-5',
    instructions: systemPrompt,
    input: userMessage,
  })

  return response.output_text?.trim() || ''
}

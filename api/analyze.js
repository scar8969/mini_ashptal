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

const getJsonBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body
  if (!req.body || typeof req.body !== 'string') return null
  try {
    return JSON.parse(req.body)
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const body = await getJsonBody(req)
  const messages = body?.messages

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages is required.' })
  }

  const cleaned = messages
    .filter(
      (msg) =>
        msg &&
        typeof msg === 'object' &&
        typeof msg.role === 'string' &&
        typeof msg.content === 'string',
    )
    .slice(-8)

  if (cleaned.length === 0) {
    return res.status(400).json({ error: 'messages is required.' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY.' })
  }

  try {
    const client = new OpenAI({ apiKey })
    const response = await client.responses.create({
      model: 'gpt-4.1-mini',
      instructions: systemPrompt,
      input: cleaned,
    })

    return res.json({ text: response.output_text?.trim() || '' })
  } catch (error) {
    console.error('Analyze error:', error)
    return res
      .status(500)
      .json({ error: 'OpenAI request failed.', detail: error?.message })
  }
}

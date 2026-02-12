import express from 'express'
import dotenv from 'dotenv'
import { analyzeSymptoms } from './openai.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 5174

app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/analyze', async (req, res) => {
  try {
    const { messages } = req.body
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

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY.' })
    }

    const text = await analyzeSymptoms(cleaned)
    return res.json({ text })
  } catch (error) {
    console.error('Analyze error:', error)
    return res
      .status(500)
      .json({ error: 'OpenAI request failed.', detail: error?.message })
  }
})


app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})

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
    const { userMessage } = req.body
    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: 'userMessage is required.' })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY.' })
    }

    const text = await analyzeSymptoms(userMessage)
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

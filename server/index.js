import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { analyzeSymptoms } from './openai.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 5174

// Basic security so your frontend can actually talk to this API
app.use(cors()) 
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, status: 'Sankat AI Backend is Live' })
})

app.post('/api/analyze', async (req, res) => {
  try {
    // We now expect the patientProfile from the frontend!
    const { messages, patientProfile } = req.body 

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
      return res.status(400).json({ error: 'Valid messages are required.' })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Missing API Key.' })
    }

    // Pass BOTH the chat history and the patient's medical data to the AI
    const text = await analyzeSymptoms(cleaned, patientProfile)
    
    return res.json({ text })
  } catch (error) {
    console.error('Analyze error:', error)
    return res
      .status(500)
      .json({ error: 'AI request failed.', detail: error?.message })
  }
})

app.listen(port, () => {
  console.log(`* Sankat AI Backend listening on http://localhost:${port}`)
})
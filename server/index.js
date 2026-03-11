import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { analyzeSymptoms } from './openai.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 5174

app.use(cors()) 
app.use(express.json({ limit: '1mb' }))

// 🚑 THE OFFLINE PHYSIOLOGICAL FALLBACK ENGINE
// This guarantees the frontend ALWAYS gets valid JSON, even if OpenAI is dead.
const emergencyFallbackAnalyze = (messages) => {
  // Grab the last thing the user said
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || ''
  const lower = lastUserMsg.toLowerCase()

  let risk = 10
  let severity = "LOW"
  let advice = "Monitor symptoms closely. If they worsen, consult a doctor."
  let reasoning = "System offline. Fallback keyword analysis triggered."

  // Map basic physiological red flags
  if (/(chest|heart|breath|airway|unconscious|faint|choking|stroke|droop)/.test(lower)) {
    risk = 95
    severity = "EMERGENCY"
    advice = "CRITICAL: Call 108 or your local emergency number IMMEDIATELY."
    reasoning = "Fallback engine detected critical life-threatening keywords (airway/cardiac/neuro)."
  } else if (/(blood|bleed|cut|burn|broken|fracture|bone)/.test(lower)) {
    risk = 75
    severity = "HIGH"
    advice = "Apply immediate first aid. Proceed to the nearest hospital or urgent care."
    reasoning = "Fallback engine detected trauma or hemorrhage keywords."
  } else if (/(fever|cough|headache|vomit|nausea)/.test(lower)) {
    risk = 35
    severity = "MODERATE"
    advice = "Rest and stay hydrated. Consider over-the-counter medication."
    reasoning = "Fallback engine detected moderate viral/systemic symptoms."
  }

  // Return EXACTLY the JSON schema the frontend expects
  return JSON.stringify({
    reasoning,
    followUpQuestions: [],
    severity,
    riskScore: risk,
    advice,
    disclaimer: "AI Estimate. Not medical advice. (Generated via Offline Fallback)"
  })
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, status: 'Sankat AI Backend is Live' })
})

app.post('/api/analyze', async (req, res) => {
  try {
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
      console.warn("⚠️ API Key missing! Triggering Fallback Engine.")
      const fallbackText = emergencyFallbackAnalyze(cleaned)
      return res.json({ text: fallbackText })
    }

    // Attempt the actual AI call
    const text = await analyzeSymptoms(cleaned, patientProfile)
    
    return res.json({ text })

  } catch (error) {
    console.error('🚨 OpenAI Analyze error intercepted:', error.message)
    
    // 🛡️ THE SAFETY NET: If the API times out, fails, or throws a 500, 
    // we catch it here and send the hardcoded emergency logic instead.
    const fallbackText = emergencyFallbackAnalyze(req.body.messages || [])
    return res.json({ text: fallbackText })
  }
})

app.listen(port, () => {
  console.log(`✚ Sankat AI Backend listening on http://localhost:${port}`)
})
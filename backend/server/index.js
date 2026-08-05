import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import { analyzeSymptoms } from './openai.js'
import { swaggerSpec } from '../swagger.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 5174

// Basic security
app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// 🚑 THE UPGRADED OFFLINE PHYSIOLOGICAL FALLBACK ENGINE
const emergencyFallbackAnalyze = (messages) => {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || ''
  const lower = lastUserMsg.toLowerCase()

  let risk = 10
  let severity = "LOW"
  let advice = "Monitor symptoms closely. If they worsen, consult a doctor."
  let reasoning = "Fallback engine: No specific high-risk keywords detected."

  // 1. CRITICAL / EMERGENCY (Risk 95)
  if (/(chest|heart|breath|airway|unconscious|faint|choke|choking|stroke|droop|poison|overdose|suicide|kill myself|allergic|anaphylaxis|seizure|fit|convulsion)/.test(lower)) {
    risk = 95
    severity = "EMERGENCY"
    advice = "CRITICAL: Call 108 or your local emergency number IMMEDIATELY. Do not wait."
    reasoning = "Fallback engine detected critical life-threatening keywords."
  
  // 2. HIGH (Risk 75)
  } else if (/(blood|bleed|cut|burn|broken|fracture|bone|snake|bite|pregnant|labor|water broke|chemical)/.test(lower)) {
    risk = 75
    severity = "HIGH"
    advice = "Apply immediate first aid if applicable. Proceed to the nearest hospital or urgent care immediately."
    reasoning = "Fallback engine detected severe trauma or acute urgent conditions."
  
  // 3. MODERATE (Risk 35)
  } else if (/(fever|cough|headache|vomit|nausea|diarrhea|sprain|twist|stomach|rash)/.test(lower)) {
    risk = 35
    severity = "MODERATE"
    advice = "Rest and stay hydrated. Consider over-the-counter medication. See a doctor if symptoms persist."
    reasoning = "Fallback engine detected moderate viral, systemic, or minor physical symptoms."
  }

  // Return EXACTLY the JSON schema the frontend expects
  return JSON.stringify({
    reasoning,
    followUpQuestions: [],
    severity,
    riskScore: risk,
    advice: advice, // Clean advice, no "SYSTEM ALERT" text here!
    disclaimer: "OFFLINE MODE: Keyword Estimate. Not medical advice."
  })
}

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health check
 *     description: Returns whether the backend is up and running.
 *     responses:
 *       200:
 *         description: Backend is live.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 status:
 *                   type: string
 */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, status: 'Sankat AI Backend is Live' })
})

/**
 * @openapi
 * /api/analyze:
 *   post:
 *     summary: Analyze patient symptoms
 *     description: >
 *       Sends conversation history and an optional patient profile to the AI triage engine.
 *       Falls back to a local keyword-based severity estimate if OPENAI_API_KEY is missing
 *       or the OpenAI request fails.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [messages]
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [role, content]
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *               patientProfile:
 *                 type: object
 *                 description: Optional patient context (age, gender, blood group, conditions, allergies, medications).
 *     responses:
 *       200:
 *         description: Triage analysis result (stringified JSON with severity/advice, or offline fallback).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 text:
 *                   type: string
 *                 isOfflineFallback:
 *                   type: boolean
 *       400:
 *         description: Missing or invalid `messages` array.
 */
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

    // 🎯 If API key is missing entirely, instantly trigger the fallback with the flag
    if (!process.env.OPENAI_API_KEY) {
      console.warn("⚠️ API Key missing! Triggering Fallback Engine.")
      const fallbackText = emergencyFallbackAnalyze(cleaned)
      return res.json({ text: fallbackText, isOfflineFallback: true }) 
    }

    // 🎯 Attempt the actual AI call
    const text = await analyzeSymptoms(cleaned, patientProfile)
    return res.json({ text, isOfflineFallback: false }) // Flag is false, AI worked!

  } catch (error) {
    console.error('🚨 OpenAI Analyze error intercepted:', error.message)
    
    // 🎯 If the API times out or fails, catch it and send fallback with the flag
    const fallbackText = emergencyFallbackAnalyze(req.body.messages || [])
    return res.json({ text: fallbackText, isOfflineFallback: true }) 
  }
})

app.listen(port, () => {
  console.log(`✚ Sankat AI Backend listening on http://localhost:${port}`)
})
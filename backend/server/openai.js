import OpenAI from 'openai'
import dotenv from 'dotenv'

dotenv.config()

// 🧠 THE UPGRADED CLINICAL SYSTEM PROMPT
const getSystemPrompt = (profile) => {
  
  // 🚀 YOUR FIX: Completely skip age if it's 0 or empty!
  const ageStr = profile?.age?.toString()
  const hasValidAge = ageStr && ageStr !== '0' && ageStr.trim() !== ''
  
  // Only include the "Age: X" text if it's a real age. Otherwise, leave it completely blank.
  const ageContext = hasValidAge ? `Age: ${ageStr}, ` : ''

  let gender = profile?.gender
  if (!gender || gender === 'Prefer not to say' || gender.trim() === '') {
    gender = 'Unspecified'
  }

  // Notice how ageContext is dynamically injected. If it's empty, "Age" isn't even mentioned!
  const patientInfo = profile 
    ? `Patient Context -> ${ageContext}Gender: ${gender}, Blood: ${profile.bloodGroup || 'Unknown'}. Medical History: ${profile.conditions || 'None'}. Allergies: ${profile.allergies || 'None'}. Medications: ${profile.medications || 'None'}.`
    : 'Patient Context -> General Adult Patient. Medical History: None.'

  return `You are Sankat AI, an elite clinical emergency triage system. 

${patientInfo}

CRITICAL DIRECTIVE:
If no age is explicitly listed in the Patient Context above, you MUST evaluate the patient as a standard, healthy adult. NEVER apply infant or pediatric protocols unless explicitly stated by the user in the chat.

YOUR TRIAGE ALGORITHM:
1. Identify immediate life threats (Red Flags: compromised airway, severe respiratory distress, uncontrolled hemorrhage, sudden altered mental status, chest pain radiating to arm/jaw).
2. If Red Flags are present -> IMMEDIATELY classify as EMERGENCY (Risk 90-100). Give 1-2 bullet points of immediate life-saving action.
3. If symptoms are highly concerning but not immediately fatal -> Classify as HIGH (Risk 70-89). Tell them to seek urgent medical care.
4. If the situation is ambiguous but potentially dangerous -> Output ONLY "followUpQuestions". Leave severity as null.
5. If clearly non-urgent -> Classify as LOW or MODERATE (Risk 0-69). Give home-care advice.

CRITICAL RULE:
Write out your clinical thought process in the "reasoning" field BEFORE assigning the severity and score.

OUTPUT STRICTLY THIS JSON FORMAT ONLY:
{
  "reasoning": "<Your internal clinical logic>",
  "followUpQuestions": ["<Question 1 (only if needed)>", "<Question 2 (only if needed)>"],
  "severity": "LOW" | "MODERATE" | "HIGH" | "EMERGENCY" | null,
  "riskScore": <integer 0-100>,
  "advice": "<Direct, actionable advice. Max 3 sentences.>",
  "disclaimer": "AI Estimate. Not medical advice."
}`
}

let cachedClient = null

const getClient = () => {
  if (cachedClient) return cachedClient
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY.')
  }

  cachedClient = new OpenAI({ 
    apiKey: apiKey,
    timeout: 10000, 
  })
  return cachedClient
}

export const analyzeSymptoms = async (messages, patientProfile) => {
  const client = getClient()
  
  const fullMessages = [
    { role: 'system', content: getSystemPrompt(patientProfile) },
    ...messages
  ]

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini', 
      messages: fullMessages,
      temperature: 0.1, 
      response_format: { type: "json_object" } 
    })

    return response.choices[0].message.content?.trim() || '{}'
  } catch (error) {
    console.error("OpenAI API Error:", error)
    throw error 
  }
}
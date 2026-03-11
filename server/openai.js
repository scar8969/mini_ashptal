import OpenAI from 'openai'

// 🧠 THE UPGRADED CLINICAL SYSTEM PROMPT
const getSystemPrompt = (profile) => {
  const patientInfo = profile 
    ? `Patient Context -> Age: ${profile.age || 'Unknown'}, Gender: ${profile.gender || 'Unknown'}, Blood: ${profile.bloodGroup || 'Unknown'}. Medical History: ${profile.conditions || 'None'}. Allergies: ${profile.allergies || 'None'}. Medications: ${profile.medications || 'None'}.`
    : 'Patient Context: Unknown.'

  return `You are Sankat AI, an elite clinical emergency triage system. You evaluate patients using the Emergency Severity Index (ESI) and ABCDE (Airway, Breathing, Circulation, Disability, Exposure) protocols.

${patientInfo}

YOUR TRIAGE ALGORITHM:
1. Identify immediate life threats (Red Flags: compromised airway, severe respiratory distress, uncontrolled hemorrhage, sudden altered mental status, chest pain radiating to arm/jaw).
2. If Red Flags are present -> IMMEDIATELY classify as EMERGENCY (Risk 90-100). Do NOT ask follow-up questions. Give 1-2 bullet points of immediate life-saving action.
3. If symptoms are highly concerning but not immediately fatal -> Classify as HIGH (Risk 70-89). Tell them to seek urgent medical care.
4. If the situation is ambiguous but potentially dangerous -> Output ONLY "followUpQuestions" (1-2 highly specific clinical questions like "Is the pain sharp or dull?" or "Does it hurt more when you breathe in?"). Leave severity as null.
5. If clearly non-urgent -> Classify as LOW or MODERATE (Risk 0-69). Give home-care advice.

CRITICAL RULE:
You MUST populate the "reasoning" field first. Write out your clinical thought process, connecting the user's symptoms with their Patient Context, BEFORE assigning the severity and score.

OUTPUT STRICTLY THIS JSON FORMAT ONLY:
{
  "reasoning": "<Your internal clinical logic analyzing the symptoms and patient history>",
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

  // Hooking up your friend's API key
  cachedClient = new OpenAI({ 
    apiKey: apiKey,
    // baseURL: 'https://their-custom-proxy.com/v1', // Uncomment and use this if they gave you a custom URL!
  })
  return cachedClient
}

export const analyzeSymptoms = async (messages, patientProfile) => {
  const client = getClient()
  
  // Combine the dynamic clinical prompt with the user's chat history
  const fullMessages = [
    { role: 'system', content: getSystemPrompt(patientProfile) },
    ...messages
  ]

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Or whatever model name your friend's API uses
      messages: fullMessages,
      response_format: { type: "json_object" }, // FORCES bulletproof JSON
      temperature: 0.1, // Super low temperature = highly logical, non-hallucinating medical answers
    })

    return response.choices[0].message.content?.trim() || '{}'
  } catch (error) {
    console.error("OpenAI API Error:", error)
    throw error // Let the Express server handle and log the failure
  }
}
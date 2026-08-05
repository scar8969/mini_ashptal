import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

// --- CONSTANTS & HELPERS ---
const seedMessages = []

const FIRST_AID_GUIDES = [
  {
    key: 'heart_attack',
    title: 'Heart Attack',
    keywords: ['heart attack', 'chest pain', 'pressure', 'tightness', 'crushing'],
    steps: [
      'Call emergency services immediately.',
      'Have the person rest and stay calm.',
      'If prescribed, assist with nitroglycerin.',
      'If not allergic, give one aspirin to chew.',
    ],
  },
  {
    key: 'stroke',
    title: 'Stroke',
    keywords: ['stroke', 'face droop', 'arm weakness', 'slurred speech', 'fast'],
    steps: [
      'Call emergency services immediately.',
      'Note the time symptoms started.',
      'Keep the person still and comfortable.',
      'Do not give food or drink.',
    ],
  },
  {
    key: 'choking',
    title: 'Choking',
    keywords: ['choking', "can't breathe", 'cannot breathe', 'airway', 'coughing'],
    steps: [
      'Ask if they can cough or speak.',
      'If not, give 5 back blows.',
      'Then give 5 abdominal thrusts.',
      'Repeat until help arrives.',
    ],
  },
  {
    key: 'severe_bleeding',
    title: 'Severe Bleeding',
    keywords: ['severe bleeding', 'bleeding heavily', 'bleeding', 'blood loss'],
    steps: [
      'Apply firm direct pressure.',
      'Use a clean cloth or bandage.',
      'Keep pressure until help arrives.',
      'Elevate the wound if possible.',
    ],
  },
  {
    key: 'burns',
    title: 'Burns',
    keywords: ['burn', 'burns', 'scald'],
    steps: [
      'Cool the burn with running water.',
      'Remove tight items near the burn.',
      'Cover with a clean, dry cloth.',
      'Do not apply creams or ice.',
    ],
  },
]

// ⚡ SMART LOCAL ANALYSIS (Frontend Fallback if Backend is totally dead)
const localAnalyze = (text) => {
  const lower = text.toLowerCase()
  let risk = 10
  let severity = "LOW"
  let advice = "Monitor symptoms closely. If they worsen, consult a doctor."

  if (/(chest|heart|breath|airway|unconscious|faint|choke|choking|stroke|droop|poison|overdose|suicide|kill myself|allergic|anaphylaxis|seizure|fit|convulsion)/.test(lower)) {
    risk = 95
    severity = "EMERGENCY"
    advice = "CRITICAL: Call 108 or your local emergency number IMMEDIATELY. Do not wait."
  } else if (/(blood|bleed|cut|burn|broken|fracture|bone|snake|bite|pregnant|labor|water broke|chemical)/.test(lower)) {
    risk = 75
    severity = "HIGH"
    advice = "Apply immediate first aid if applicable. Proceed to the nearest hospital or urgent care immediately."
  } else if (/(fever|cough|headache|vomit|nausea|diarrhea|sprain|twist|stomach|rash)/.test(lower)) {
    risk = 35
    severity = "MODERATE"
    advice = "Rest and stay hydrated. Consider over-the-counter medication. See a doctor if symptoms persist."
  }

  return JSON.stringify({
    severity,
    riskScore: risk,
    advice: advice, // Clean advice!
    disclaimer: "OFFLINE MODE: Keyword Estimate. Not medical advice."
  })
}

// 🚀 INJECTED PATIENT PROFILE INTO API REQUEST
const analyzeSymptoms = async (history, patientProfile, setOfflineStatus) => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, patientProfile }), 
    })

    if (!response.ok) throw new Error('API unavailable')
    
    const data = await response.json()

    // 🎯 Toggle the banner based on the backend's flag
    if (data.isOfflineFallback) {
      setOfflineStatus(true)
    } else {
      setOfflineStatus(false)
    }

    return data.text

  } catch {
    // 🎯 If the server is totally dead, turn on banner and run local fallback
    setOfflineStatus(true)
    const lastUserMessage = history[history.length - 1].content
    return localAnalyze(lastUserMessage)
  }
}

const safeParse = (value, fallback) => {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const formatTextWithBold = (text) => {
  if (!text) return null;
  return text.split('**').map((part, index) => 
    index % 2 === 1 ? <strong key={index}>{part}</strong> : part
  );
}

// --- MAIN COMPONENT ---

function EmergencyDashboard() {
  const [messages, setMessages] = useState(seedMessages)
  const [input, setInput] = useState('')
  const [isEmergency, setIsEmergency] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [contacts, setContacts] = useState([])
  const [selectedContactId, setSelectedContactId] = useState('')
  const [hospitalError, setHospitalError] = useState('')
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [lastRiskScore, setLastRiskScore] = useState(null)
  
  // 🎯 State for the red pulsing header banner
  const [isOffline, setIsOffline] = useState(false)

  const [insuranceInfo, setInsuranceInfo] = useState({
    provider: '', policyNumber: '', policyHolder: '', relationship: 'Self',
    helpline: '', validTill: '', coverageType: '', tpa: '',
  })
  const [insuranceNotice, setInsuranceNotice] = useState('')

  const [medicalCard, setMedicalCard] = useState({
    fullName: '', age: '', bloodGroup: '', allergies: '', medications: '',
    conditions: '', emergencyContact: '', insurance: '',
  })
  const [medicalNotice, setMedicalNotice] = useState('')

  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMeta, setStreamingMeta] = useState(null)
  const streamingRef = useRef(null)

  const chatContainerRef = useRef(null)
  const [hasGreeted, setHasGreeted] = useState(false)
  const sendMessageRef = useRef(null)

  // --- EFFECTS ---

  // 🎯 Initial Health Ping - Turns banner on/off appropriately 
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch('/api/health')
        setIsOffline(!res.ok) 
      } catch {
        setIsOffline(true) 
      }
    }
    checkServer()
  }, [])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, streamingText])

  useEffect(() => {
    const stored = localStorage.getItem('emergencyContacts')
    if (stored) {
      const parsed = safeParse(stored, [])
      if (Array.isArray(parsed)) {
        setContacts(parsed)
        if (parsed.length > 0) setSelectedContactId(parsed[0].id)
      }
    }
  }, [])

  useEffect(() => {
    const storedMed = localStorage.getItem('medicalCard')
    if (storedMed) {
      const parsed = safeParse(storedMed, null)
      if (parsed?.data) setMedicalCard((prev) => ({ ...prev, ...parsed.data }))
      else if (parsed && typeof parsed === 'object') setMedicalCard((prev) => ({ ...prev, ...parsed }))
    }

    const storedIns = localStorage.getItem('insuranceInfo')
    if (storedIns) {
      const parsed = safeParse(storedIns, null)
      if (parsed && typeof parsed === 'object') setInsuranceInfo((prev) => ({ ...prev, ...parsed }))
    }
  }, [])

  useEffect(() => {
    if (!hasGreeted && medicalCard.fullName !== '') {
      let greetingText = ''
      const isGuest = medicalCard.fullName.toLowerCase().includes('guest')

      if (isGuest) {
        greetingText = "**Hey there, Guest!** 🚨\n\nI'm **Sankat AI**, your emergency triage assistant. Since you're using a Guest account, I don't have your medical history on file.\n\nPlease describe your symptoms, and mention your **age** and any **pre-existing conditions** so I can accurately assess your situation."
      } else {
        const blood = medicalCard.bloodGroup || 'Unknown'
        const conds = medicalCard.conditions || 'None listed'
        const allergies = medicalCard.allergies || 'None listed'
        const age = medicalCard.age || 'Unknown'
        
        greetingText = `**Hi ${medicalCard.fullName}!** 🚨\n\nI'm **Sankat AI**, your triage assistant.\n\nI have your chart loaded:\n• **Age**: ${age}\n• **Blood Type**: ${blood}\n• **Conditions**: ${conds}\n• **Allergies**: ${allergies}\n\n**How can I help you today?** Please describe any symptoms you're experiencing.`
      }

      const welcomeMessage = { id: Date.now(), sender: 'bot', text: greetingText, severity: null }
      
      setTimeout(() => {
        setMessages([welcomeMessage])
        setHasGreeted(true)
      }, 500)
    }
  }, [medicalCard, hasGreeted])

  useEffect(() => {
    if (insuranceNotice) {
      const timeout = setTimeout(() => setInsuranceNotice(''), 3000)
      return () => clearTimeout(timeout)
    }
  }, [insuranceNotice])

  useEffect(() => {
    if (medicalNotice) {
      const timeout = setTimeout(() => setMedicalNotice(''), 3000)
      return () => clearTimeout(timeout)
    }
  }, [medicalNotice])

  // --- VOICE LOGIC ---
  useEffect(() => {
    if (!isVoiceMode) {
      setIsListening(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setHospitalError('Voice mode is not supported in this browser.')
      setIsVoiceMode(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => isVoiceMode ? recognition.start() : setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1]
      const transcript = last?.[0]?.transcript?.trim()
      if (transcript) sendMessageRef.current?.(transcript)
    }

    recognition.start()
    return () => recognition.stop()
  }, [isVoiceMode])

  const speakText = (text) => {
    if (!isVoiceMode || !text || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const cleanText = text.replace(/\*\*/g, '')
    const utterance = new SpeechSynthesisUtterance(cleanText)
    window.speechSynthesis.speak(utterance)
  }

  // --- ACTIONS ---

  const handleSend = async (event) => {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    sendMessage(trimmed)
  }

  const sendMessage = async (text) => {
    const userMessage = { id: Date.now(), sender: 'user', text }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // 🎯 FIX: Filter out the welcome message so the AI doesn't read its own greeting and get confused!
      const history = [...messages, userMessage]
        .filter((m) => !m.text.includes("I'm **Sankat AI**")) 
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant', 
          content: m.text
        }))

      // Pass the setIsOffline callback
      const responseText = await analyzeSymptoms(history, medicalCard, setIsOffline)
      
      let parsed = null
      try { parsed = JSON.parse(responseText) } catch { parsed = null }

      let botMessage = { id: Date.now() + 1, sender: 'bot', text: 'I could not generate guidance right now.' }

      if (parsed?.followUpQuestions?.length) {
        botMessage.text = parsed.followUpQuestions.join(' ')
      } else if (parsed?.severity && typeof parsed?.riskScore === 'number') {
        const riskScore = Math.max(0, Math.min(100, Math.round(parsed.riskScore)))
        
        botMessage = {
          ...botMessage,
          text: parsed.advice || '',
          severity: parsed.severity,
          riskScore: riskScore
        }
        
        setLastRiskScore(riskScore)
        if (parsed.severity === 'EMERGENCY') setIsEmergency(true)
      }

      const words = botMessage.text.split(' ')
      let wordIndex = 0
      setIsStreaming(true)
      setStreamingText('')
      
      setStreamingMeta({ severity: botMessage.severity, riskScore: botMessage.riskScore })

      streamingRef.current = setInterval(() => {
        wordIndex++
        setStreamingText(words.slice(0, wordIndex).join(' '))
        if (wordIndex >= words.length) {
          clearInterval(streamingRef.current)
          streamingRef.current = null
          setIsStreaming(false)
          setStreamingText('')
          setStreamingMeta(null)
          setMessages((prev) => [...prev, botMessage])
          speakText(botMessage.text)
        }
      }, 60)
    } catch {
      const fallback = 'Service is temporarily unavailable.'
      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'bot', text: fallback }])
    } finally {
      setIsLoading(false)
    }
  }
  sendMessageRef.current = sendMessage

  const selectedContact = contacts.find((c) => c.id === selectedContactId)
  const primaryContact = selectedContact || contacts[0]

  const handleCallContact = () => primaryContact && (window.location.href = `tel:${primaryContact.phone}`)

  const handleFindHospitals = () => {
    if (!navigator.geolocation) return setHospitalError('Geolocation not supported.')
    setHospitalError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.location.href = `https://www.google.com/maps/search/hospitals/@${pos.coords.latitude},${pos.coords.longitude},14z`
      },
      () => setHospitalError('Location permission denied.')
    )
  }

  const handleSendLocationAlert = () => {
    if (!primaryContact || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      const mapLink = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`
      const body = encodeURIComponent(`Medical Emergency! My location: ${mapLink}`)
      window.location.href = `sms:${primaryContact.phone}?body=${body}`
    })
  }

  const medicalInfoText = useMemo(() => {
    const contactLine = primaryContact ? `${primaryContact.name} (${primaryContact.phone})` : medicalCard.emergencyContact
    return `Name: ${medicalCard.fullName}\nAge: ${medicalCard.age || 'N/A'}\nBlood: ${medicalCard.bloodGroup}\nAllergies: ${medicalCard.allergies}\nConditions: ${medicalCard.conditions}\nMeds: ${medicalCard.medications}\nContact: ${contactLine}\nIns: ${insuranceInfo.provider}`
  }, [medicalCard, insuranceInfo, primaryContact])

  const handleCopy = async (text, setNotice) => {
    try { await navigator.clipboard.writeText(text); setNotice('Copied!') }
    catch { setNotice('Copy failed.') }
  }

  const handleShare = async (title, text, setNotice) => {
    if (navigator.share) {
      try { await navigator.share({ title, text }); setNotice('Shared!') } catch { /* user cancelled share */ }
    } else {
      handleCopy(text, setNotice)
    }
  }

  const riskScore = lastRiskScore ?? 0

  return (
    <div className="app dashboard">

      {/* 🎯 Explicit Server Warning Header */}
      <nav className="top-navbar">
        <style>{`
          @keyframes offline-pulse {
            0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); transform: scale(0.99); background-color: rgba(220, 38, 38, 0.05); }
            50% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); transform: scale(1.01); background-color: rgba(220, 38, 38, 0.12); }
            100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); transform: scale(0.99); background-color: rgba(220, 38, 38, 0.05); }
          }
          .badge-offline {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 8px 16px;
            border-radius: var(--radius-md); 
            border: 1px solid rgba(220, 38, 38, 0.3);
            animation: offline-pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            text-align: left;
          }
          .badge-offline-icon {
            color: #DC2626;
            width: 20px;
            height: 20px;
            flex-shrink: 0;
          }
          .badge-offline-text {
            display: flex;
            flex-direction: column;
          }
          .badge-offline-title {
            font-size: 0.75rem;
            font-weight: 800;
            color: #DC2626;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            line-height: 1.2;
          }
          .badge-offline-sub {
            font-size: 0.68rem;
            font-weight: 600;
            color: #7F1D1D;
            line-height: 1.2;
            margin-top: 2px;
          }
          @media (max-width: 600px) {
            .badge-offline-sub { display: none; }
            .badge-offline { padding: 6px 12px; }
          }
        `}</style>
        
        <div className="navbar-brand">
          <div className="navbar-brand-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.25 4.53l-6.72 3.36a2 2 0 00-1.03 1.57v4.61c0 4.15 2.62 7.89 6.46 9.2a2 2 0 001.28 0c3.84-1.31 6.46-5.05 6.46-9.2v-4.6a2 2 0 00-1.03-1.58l-6.72-3.36a2 2 0 00-1.78 0z" />
              <path fillRule="evenodd" d="M12 7.5a.75.75 0 01.75.75v3h3a.75.75 0 010 1.5h-3v3a.75.75 0 01-1.5 0v-3h-3a.75.75 0 010-1.5h3v-3A.75.75 0 0112 7.5z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="navbar-brand-text">
            <span className="navbar-title">Sankat.Ai</span>
            <span className="navbar-subtitle">Emergency Response</span>
          </div>
        </div>

        <div className="navbar-actions">
          {/* 🎯 Explicit Warning Banner */}
          {isOffline && (
            <div className="badge-offline">
              <svg className="badge-offline-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <div className="badge-offline-text">
                <span className="badge-offline-title">AI Server Down: Basic Backup</span>
                <span className="badge-offline-sub">Please rely on a doctor for emergencies.</span>
              </div>
            </div>
          )}
          <Link to="/onboarding" className="navbar-link">Edit Profile</Link>
        </div>
      </nav>

      <div className="dashboard-content">

        {/* Emergency Panel */}
        {isEmergency && (
          <section className="emergency-panel">
            <div>
              <h2>⚠️ Possible Emergency</h2>
              <p>Risk Score: <strong>{riskScore}</strong></p>
            </div>

            <div className="emergency-actions">
              <a href="tel:108" className="action-btn danger" style={{ textDecoration: 'none' }}>
                📞 Call Ambulance
              </a>
              <button onClick={handleCallContact} disabled={!primaryContact} className="action-btn outline">
                📱 Call Contact
              </button>
              <button onClick={handleSendLocationAlert} disabled={!primaryContact} className="action-btn outline">
                📍 Share Location
              </button>
              <button onClick={handleFindHospitals} className="action-btn outline">
                🏥 Find Hospital
              </button>
            </div>
            <button onClick={() => setIsEmergency(false)} className="dismiss-btn">
              Dismiss
            </button>
          </section>
        )}

        {/* Main Grid */}
        <div className="dashboard-grid">

          {/* Left: Patient + Medical Summary */}
          <div className="info-cards">

            <div className="patient-card-compact">
              <div className="patient-compact-row">
                <div>
                  <span className="progress-label">PATIENT</span>
                  <h3 className="patient-compact-name">
                    {medicalCard.fullName || 'Guest'}
                  </h3>
                </div>
                <div className="patient-compact-blood">
                  <span className="progress-label">BLOOD</span>
                  <span className="blood-badge-sm">{medicalCard.bloodGroup || '?'}</span>
                </div>
              </div>
            </div>

            <span className="sidebar-label">Medical Summary</span>

            <div className="info-card">
              <div className="info-card-header">
                <h3><span className="card-icon">🩺</span> Medical ID</h3>
                <button onClick={() => handleShare('Medical ID', medicalInfoText, setMedicalNotice)} className="ghost-button">Share</button>
              </div>
              <div className="info-card-row">
                <small>ALLERGIES</small>
                <p>{medicalCard.allergies || 'None'}</p>
              </div>
              <div className="info-card-row">
                <small>CONDITIONS</small>
                <p>{medicalCard.conditions || 'None'}</p>
              </div>
              <div className="info-card-row">
                <small>MEDICATIONS</small>
                <p>{medicalCard.medications || 'None'}</p>
              </div>
              {medicalNotice && <small style={{ color: 'green', display: 'block', marginTop: '5px' }}>{medicalNotice}</small>}
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <h3><span className="card-icon">🛡️</span> Insurance</h3>
              </div>
              <div className="info-card-row">
                <small>PROVIDER</small>
                <p>{insuranceInfo.provider || 'N/A'}</p>
              </div>
              <div className="info-card-row">
                <small>POLICY #</small>
                <p>{insuranceInfo.policyNumber || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Right: Chat — PRIMARY FEATURE */}
          <div className="chat-panel">
            <div className="chat-header">
              <h3>🤖 AI Triage</h3>
              <small>Describe symptoms for guidance</small>
            </div>

            {/* Messages */}
            <div className="chat-messages" ref={chatContainerRef}>
              {messages.length === 0 && (
                <div className="chat-empty">
                  <span>🩺</span>
                  <p>Type symptoms or tap Mic to speak</p>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`chat-bubble-wrapper ${msg.sender}`}>
                  <div className={`chat-bubble ${msg.sender}`} style={{ padding: msg.severity ? '0' : '', overflow: 'hidden' }}>
                    
                    {msg.severity && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        background: 'var(--accent-soft)', 
                        color: 'var(--danger)', 
                        padding: '6px 12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold', 
                        letterSpacing: '0.5px',
                        borderBottom: '1px solid rgba(220, 38, 38, 0.2)' 
                      }}>
                        <span>SEVERITY: {msg.severity}</span>
                        <span>RISK SCORE: {msg.riskScore}</span>
                      </div>
                    )}
                    
                    <div style={{ padding: msg.severity ? '10px 14px' : '' }}>
                      <p style={{ margin: 0 }}>{formatTextWithBold(msg.text)}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* STREAMING MESSAGE BUBBLE */}
              {isStreaming && streamingText && (
                <div className="chat-bubble-wrapper bot">
                  <div className="chat-bubble bot" style={{ padding: streamingMeta?.severity ? '0' : '', overflow: 'hidden' }}>
                    
                    {streamingMeta?.severity && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        background: 'var(--accent-soft)', 
                        color: 'var(--danger)', 
                        padding: '6px 12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold', 
                        letterSpacing: '0.5px',
                        borderBottom: '1px solid rgba(220, 38, 38, 0.2)' 
                      }}>
                        <span>SEVERITY: {streamingMeta.severity}</span>
                        <span>RISK SCORE: {streamingMeta.riskScore}</span>
                      </div>
                    )}

                    <div style={{ padding: streamingMeta?.severity ? '10px 14px' : '' }}>
                      <p style={{ margin: 0 }}>{formatTextWithBold(streamingText)}<span className="streaming-cursor">|</span></p>
                    </div>
                  </div>
                </div>
              )}
              {isLoading && !isStreaming && <div className="chat-loading">Analyzing...</div>}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSend} className="chat-input-bar">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening..." : "Type symptoms..."}
              />

              <button
                type="button"
                onClick={() => setIsVoiceMode(!isVoiceMode)}
                className={`icon-btn mic ${isVoiceMode ? 'active' : ''}`}
                title="Toggle Voice"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="icon-btn send"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(45deg) translateX(-2px)' }}>
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
          </div>

        </div>
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="footer-cross">✚</span> Sankat.Ai
          </div>
          <hr className="footer-divider" />
          <p className="footer-text">
            AI-powered emergency triage. Not a substitute for professional medical advice.
          </p>
          <p className="footer-text">
            © 2026 Sankat.Ai — All data stored locally on your device.
          </p>
        </div>
      </footer>

      {hospitalError && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'black', color: 'white', padding: '10px 20px', borderRadius: '20px', zIndex: 2000 }}>
          {hospitalError}
        </div>
      )}

      <button
        className="sos-floating-btn"
        onClick={() => setIsEmergency(true)}
      >
        SOS
      </button>

    </div>
  )
}

export default EmergencyDashboard
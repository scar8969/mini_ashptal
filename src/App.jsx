import { useEffect, useState } from 'react'
import './App.css'

const seedMessages = []

const FIRST_AID_GUIDES = [
  {
    key: 'heart_attack',
    title: 'Heart Attack',
    keywords: ['heart attack', 'chest pain', 'pressure', 'tightness'],
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
    keywords: ['choking', 'can’t breathe', 'cannot breathe', 'airway', 'coughing'],
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

const getFirstAidGuides = (text) => {
  if (!text) return []
  const lowered = text.toLowerCase()
  return FIRST_AID_GUIDES.filter((guide) =>
    guide.keywords.some((keyword) => lowered.includes(keyword)),
  )
}

const analyzeSymptoms = async (history) => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: history }),
  })

  if (!response.ok) {
    throw new Error('Unable to analyze symptoms right now.')
  }

  const data = await response.json()
  return data.text
}

function App() {
  const [messages, setMessages] = useState(seedMessages)
  const [input, setInput] = useState('')
  const [isEmergency, setIsEmergency] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [contacts, setContacts] = useState([])
  const [selectedContactId, setSelectedContactId] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [isFindingHospitals, setIsFindingHospitals] = useState(false)
  const [hospitalError, setHospitalError] = useState('')
  const [isMedicalCardVisible, setIsMedicalCardVisible] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isMedicalCardLocked, setIsMedicalCardLocked] = useState(false)
  const [lastRiskScore, setLastRiskScore] = useState(null)
  const [medicalCard, setMedicalCard] = useState({
    fullName: '',
    bloodGroup: '',
    allergies: '',
    medications: '',
    conditions: '',
    emergencyContact: '',
    insurance: '',
  })

  useEffect(() => {
    const stored = localStorage.getItem('emergencyContacts')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setContacts(parsed)
          if (parsed.length > 0) {
            setSelectedContactId(parsed[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to parse contacts.')
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('emergencyContacts', JSON.stringify(contacts))
  }, [contacts])

  useEffect(() => {
    const stored = localStorage.getItem('medicalCard')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed && typeof parsed === 'object') {
          if (parsed.data && typeof parsed.data === 'object') {
            setMedicalCard((prev) => ({ ...prev, ...parsed.data }))
          }
          if (typeof parsed.locked === 'boolean') {
            setIsMedicalCardLocked(parsed.locked)
          }
        }
      } catch (error) {
        console.error('Failed to parse medical card.')
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      'medicalCard',
      JSON.stringify({ data: medicalCard, locked: isMedicalCardLocked }),
    )
  }, [medicalCard, isMedicalCardLocked])

  useEffect(() => {
    if (!isVoiceMode) {
      setIsListening(false)
      return
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
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
    recognition.onend = () => {
      if (isVoiceMode) {
        recognition.start()
      } else {
        setIsListening(false)
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1]
      const transcript = last?.[0]?.transcript?.trim()
      if (transcript) {
        sendMessage(transcript)
      }
    }

    recognition.start()

    return () => {
      recognition.onend = null
      recognition.onresult = null
      recognition.onerror = null
      recognition.stop()
    }
  }, [isVoiceMode])

  const speakText = (text) => {
    if (!isVoiceMode || !text || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1
    window.speechSynthesis.speak(utterance)
  }

  const handleSend = async (event) => {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return

    sendMessage(trimmed)
  }

  const sendMessage = async (text) => {
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const history = [...messages, userMessage].map((message) => ({
        role: message.sender === 'user' ? 'user' : 'assistant',
        content: message.text,
      }))

      const responseText = await analyzeSymptoms(history)
      let parsed = null

      try {
        parsed = JSON.parse(responseText)
      } catch {
        parsed = null
      }

      let botText = 'I could not generate guidance right now.'

      if (parsed?.followUpQuestions?.length) {
        botText = parsed.followUpQuestions.join(' ')
      } else if (parsed?.severity && typeof parsed?.riskScore === 'number') {
        const riskScore = Math.max(
          0,
          Math.min(100, Math.round(parsed.riskScore)),
        )

        botText = `Severity: ${parsed.severity}
RiskScore: ${riskScore}
Advice: ${parsed.advice || ''}
Disclaimer: ${parsed.disclaimer || 'This is not a medical diagnosis.'}`

        setLastRiskScore(riskScore)
        if (parsed.severity === 'EMERGENCY') {
          setIsEmergency(true)
        }
      }

      const botMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: botText,
      }

      setMessages((prev) => [...prev, botMessage])
      speakText(botText)
    } catch (error) {
      const fallback =
        'Service is temporarily unavailable. If this feels urgent, contact emergency services now.'
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: fallback,
        },
      ])
      speakText(fallback)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddContact = (event) => {
    event.preventDefault()
    const name = contactName.trim()
    const phone = contactPhone.trim()
    if (!name || !phone) return

    const newContact = {
      id: `${Date.now()}`,
      name,
      phone,
    }

    setContacts((prev) => [...prev, newContact])
    setSelectedContactId(newContact.id)
    setContactName('')
    setContactPhone('')
  }

  const selectedContact = contacts.find(
    (contact) => contact.id === selectedContactId,
  )

  const handleCallContact = () => {
    if (!selectedContact) return
    window.location.href = `tel:${selectedContact.phone}`
  }

  const handleFindHospitals = () => {
    if (!navigator.geolocation) {
      setHospitalError('Geolocation is not supported in this browser.')
      return
    }

    setIsFindingHospitals(true)
    setHospitalError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        const url = `https://www.google.com/maps/search/?api=1&query=hospitals%20near%20me&center=${latitude},${longitude}`
        window.location.href = url
        setIsFindingHospitals(false)
      },
      () => {
        setIsFindingHospitals(false)
        setHospitalError('Location permission denied.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const handleSendLocationAlert = () => {
    if (!selectedContact) return
    if (!navigator.geolocation) {
      setHospitalError('Geolocation is not supported in this browser.')
      return
    }

    setIsFindingHospitals(true)
    setHospitalError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`
        const body = encodeURIComponent(
          `I may be experiencing a medical emergency. My location: ${mapLink}`,
        )
        window.location.href = `sms:${selectedContact.phone}?body=${body}`
        setIsFindingHospitals(false)
      },
      () => {
        setIsFindingHospitals(false)
        setHospitalError('Location permission denied.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const handleMedicalCardChange = (field) => (event) => {
    const value = event.target.value
    if (isMedicalCardLocked) return
    setMedicalCard((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveMedicalCard = () => {
    setIsMedicalCardLocked(true)
  }

  const handleResetMedicalCard = () => {
    setIsMedicalCardLocked(false)
    setIsMedicalCardVisible(false)
    setMedicalCard({
      fullName: '',
      bloodGroup: '',
      allergies: '',
      medications: '',
      conditions: '',
      emergencyContact: '',
      insurance: '',
    })
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" aria-hidden="true" />
          <div>
            <p className="brand-title">asptalV1.8</p>
            <p className="brand-subtitle">Rapid guidance for urgent situations</p>
          </div>
        </div>
        <div className="status-pill">Online</div>
      </header>

      <section
        className={`emergency-panel ${isEmergency ? 'active' : 'hidden'}`}
        aria-hidden={!isEmergency}
      >
        <div className="emergency-panel__content">
          <div className="emergency-panel__title">
            <h2>POSSIBLE MEDICAL EMERGENCY</h2>
            <p>Stay calm. Follow the actions below.</p>
          </div>
          <div className="emergency-panel__risk card-surface">
            <p className="risk-label">Risk Score</p>
            <p className="risk-value">{lastRiskScore ?? '—'}</p>
          </div>
          <div className="emergency-panel__actions">
            <a className="emergency-btn" href="tel:108">
              Call Ambulance
            </a>
            <button
              className="emergency-btn secondary"
              type="button"
              onClick={handleCallContact}
              disabled={!selectedContact}
            >
              Call Emergency Contact
            </button>
            <button
              className="emergency-btn secondary"
              type="button"
              onClick={handleFindHospitals}
            >
              {isFindingHospitals ? 'Searching...' : 'Find Nearest Hospital'}
            </button>
            <button
              className="emergency-btn secondary"
              type="button"
              onClick={handleSendLocationAlert}
              disabled={!selectedContact}
            >
              Send Location Alert
            </button>
            <button
              className="emergency-btn secondary"
              type="button"
              onClick={() => setIsMedicalCardVisible((prev) => !prev)}
            >
              {isMedicalCardVisible ? 'Hide Medical Card' : 'Show Medical Card'}
            </button>
          </div>
        </div>
      </section>

      <main className="chat-shell">
        <div className="chat-window">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`message-row ${message.sender}`}
              style={{ '--i': index }}
            >
              <div
                className={`message-bubble ${message.sender} ${
                  message.sender === 'bot' ? 'card-surface' : ''
                }`}
              >
                {message.text}
                {message.sender === 'bot' && (
                  <div className="first-aid-list">
                    {getFirstAidGuides(message.text).map((guide) => (
                      <div
                        key={guide.key}
                        className="first-aid-card card-surface subtle"
                      >
                        <p className="first-aid-title">{guide.title}</p>
                        <ul className="first-aid-steps">
                          {guide.steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message-row bot loading">
              <div className="message-bubble bot">Analyzing...</div>
            </div>
          )}
        </div>

        <form className="chat-input" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Describe the situation..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            aria-label="Message input"
            disabled={isLoading}
          />
          <button
            type="button"
            className={`voice-toggle ${isVoiceMode ? 'active' : ''}`}
            onClick={() => setIsVoiceMode((prev) => !prev)}
          >
            {isListening ? 'Voice Mode: On' : 'Voice Mode'}
          </button>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </main>

      <section className="contacts">
        <div className="contacts-header">
          <h3>Emergency Contacts</h3>
          <p>Select a contact to call during emergencies.</p>
        </div>

        <form className="contacts-form" onSubmit={handleAddContact}>
          <input
            type="text"
            placeholder="Name"
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
          />
          <input
            type="tel"
            placeholder="Phone"
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
          />
          <button type="submit">Add Contact</button>
        </form>

        <div className="contacts-list">
          {contacts.length === 0 ? (
            <p className="contacts-empty">No contacts saved yet.</p>
          ) : (
            contacts.map((contact) => (
              <label key={contact.id} className="contact-card">
                <input
                  type="radio"
                  name="emergency-contact"
                  value={contact.id}
                  checked={selectedContactId === contact.id}
                  onChange={() => setSelectedContactId(contact.id)}
                />
                <div>
                  <p className="contact-name">{contact.name}</p>
                  <p className="contact-phone">{contact.phone}</p>
                </div>
              </label>
            ))
          )}
        </div>
      </section>

      {!isMedicalCardLocked && (
        <section className="medical-card-section">
          <div className="medical-card-header">
            <h3>Digital Medical Card</h3>
            <p>Keep essentials ready for emergencies.</p>
          </div>

          <div className="medical-card-grid">
            <form className="medical-card-form">
              <input
                type="text"
                placeholder="Full Name"
                value={medicalCard.fullName}
                onChange={handleMedicalCardChange('fullName')}
              />
              <input
                type="text"
                placeholder="Blood Group"
                value={medicalCard.bloodGroup}
                onChange={handleMedicalCardChange('bloodGroup')}
              />
              <textarea
                rows="2"
                placeholder="Allergies"
                value={medicalCard.allergies}
                onChange={handleMedicalCardChange('allergies')}
              />
              <textarea
                rows="2"
                placeholder="Current Medications"
                value={medicalCard.medications}
                onChange={handleMedicalCardChange('medications')}
              />
              <textarea
                rows="2"
                placeholder="Medical Conditions"
                value={medicalCard.conditions}
                onChange={handleMedicalCardChange('conditions')}
              />
              <input
                type="text"
                placeholder="Emergency Contact"
                value={medicalCard.emergencyContact}
                onChange={handleMedicalCardChange('emergencyContact')}
              />
              <input
                type="text"
                placeholder="Insurance (optional)"
                value={medicalCard.insurance}
                onChange={handleMedicalCardChange('insurance')}
              />
              <div className="medical-card-actions">
                <button
                  type="button"
                  className="medical-card-btn"
                  onClick={handleSaveMedicalCard}
                >
                  Save Medical Card
                </button>
                <button
                  type="button"
                  className="medical-card-btn secondary"
                  onClick={handleResetMedicalCard}
                >
                  Reset Card
                </button>
              </div>
            </form>

            <div className="medical-card-preview">
              <div className="medical-card card-surface">
                <div>
                  <p className="medical-card-label">Name</p>
                  <p className="medical-card-value">
                    {medicalCard.fullName || '—'}
                  </p>
                </div>
                <div>
                  <p className="medical-card-label">Blood Group</p>
                  <p className="medical-card-value">
                    {medicalCard.bloodGroup || '—'}
                  </p>
                </div>
                <div>
                  <p className="medical-card-label">Allergies</p>
                  <p className="medical-card-value">
                    {medicalCard.allergies || '—'}
                  </p>
                </div>
                <div>
                  <p className="medical-card-label">Medications</p>
                  <p className="medical-card-value">
                    {medicalCard.medications || '—'}
                  </p>
                </div>
                <div>
                  <p className="medical-card-label">Conditions</p>
                  <p className="medical-card-value">
                    {medicalCard.conditions || '—'}
                  </p>
                </div>
                <div>
                  <p className="medical-card-label">Emergency Contact</p>
                  <p className="medical-card-value">
                    {medicalCard.emergencyContact || '—'}
                  </p>
                </div>
                <div>
                  <p className="medical-card-label">Insurance</p>
                  <p className="medical-card-value">
                    {medicalCard.insurance || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {hospitalError && (
        <section className="hospitals card-surface">
          <p className="hospitals-error">{hospitalError}</p>
        </section>
      )}

      {isEmergency && isMedicalCardVisible && (
        <section className="medical-card-emergency">
          <h2>Medical Card</h2>
          <div className="medical-card medical-card-large card-surface">
            <div>
              <p className="medical-card-label">Name</p>
              <p className="medical-card-value">
                {medicalCard.fullName || '—'}
              </p>
            </div>
            <div>
              <p className="medical-card-label">Blood Group</p>
              <p className="medical-card-value">
                {medicalCard.bloodGroup || '—'}
              </p>
            </div>
            <div>
              <p className="medical-card-label">Allergies</p>
              <p className="medical-card-value">
                {medicalCard.allergies || '—'}
              </p>
            </div>
            <div>
              <p className="medical-card-label">Medications</p>
              <p className="medical-card-value">
                {medicalCard.medications || '—'}
              </p>
            </div>
            <div>
              <p className="medical-card-label">Conditions</p>
              <p className="medical-card-value">
                {medicalCard.conditions || '—'}
              </p>
            </div>
            <div>
              <p className="medical-card-label">Emergency Contact</p>
              <p className="medical-card-value">
                {medicalCard.emergencyContact || '—'}
              </p>
            </div>
            <div>
              <p className="medical-card-label">Insurance</p>
              <p className="medical-card-value">
                {medicalCard.insurance || '—'}
              </p>
            </div>
            <div className="medical-card-actions">
              <button
                type="button"
                className="medical-card-btn secondary"
                onClick={handleResetMedicalCard}
              >
                Reset Card
              </button>
            </div>
          </div>
        </section>
      )}

      <footer className="footer">
        asptalV1.8 provides general guidance only and does not replace
        professional medical, legal, or emergency services. In immediate danger,
        call your local emergency number.
      </footer>

      <button
        type="button"
        className="sos-button"
        onClick={() => setIsEmergency(true)}
        aria-label="Activate emergency mode"
      >
        SOS
      </button>
    </div>
  )
}

export default App

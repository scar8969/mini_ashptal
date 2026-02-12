import { useEffect, useState } from 'react'
import './App.css'

const seedMessages = [
  {
    id: 1,
    sender: 'bot',
    text: 'Hi, I am Emergency AI. Describe what you are experiencing.',
  },
  {
    id: 2,
    sender: 'user',
    text: 'There is smoke in the kitchen and the alarm is going off.',
  },
  {
    id: 3,
    sender: 'bot',
    text: 'Leave the area if unsafe and call local emergency services now.',
  },
]

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

const analyzeSymptoms = async (userMessage) => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userMessage }),
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

  const handleSend = async (event) => {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: trimmed,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const responseText = await analyzeSymptoms(trimmed)
      const botMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: responseText || 'I could not generate guidance right now.',
      }

      setMessages((prev) => [...prev, botMessage])

      if (responseText.includes('EMERGENCY')) {
        setIsEmergency(true)
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: 'Service is temporarily unavailable. If this feels urgent, contact emergency services now.',
        },
      ])
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

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" aria-hidden="true" />
          <div>
            <p className="brand-title">Emergency AI</p>
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
          <h2>POSSIBLE MEDICAL EMERGENCY</h2>
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
              <div className={`message-bubble ${message.sender}`}>
                {message.text}
                {message.sender === 'bot' && (
                  <div className="first-aid-list">
                    {getFirstAidGuides(message.text).map((guide) => (
                      <div key={guide.key} className="first-aid-card">
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

      {hospitalError && (
        <section className="hospitals">
          <p className="hospitals-error">{hospitalError}</p>
        </section>
      )}

      <footer className="footer">
        Emergency AI provides general guidance only and does not replace
        professional medical, legal, or emergency services. In immediate danger,
        call your local emergency number.
      </footer>
    </div>
  )
}

export default App

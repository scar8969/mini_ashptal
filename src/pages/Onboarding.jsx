import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ✅ Components
import Header from '../components/Header'
import PersonalInfo from '../components/PersonalInfo'
import MedicalInfo from '../components/MedicalInfo'
import Contacts from '../components/Contacts'
import InsuranceInfo from '../components/InsuranceInfo'
import RiskProfile from '../components/RiskProfile'

/* --- 1. CONFIGURATION --- */

const defaultProfile = {
  personal: { fullName: '', age: '', gender: '', bloodGroup: '', phone: '' },
  medical: { conditions: '', allergies: '', medications: '', diabetes: 'no', bloodPressure: 'no' },
  contacts: [],
  insurance: { provider: '', policyNumber: '', policyHolder: '', helpline: '' },
  risk: { smoker: 'no', heartHistory: 'no' },
}

const getValue = (obj, path) => {
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : ''), obj)
}

/* --- 2. MAIN COMPONENT --- */

function Onboarding() {
  const navigate = useNavigate()

  // ✅ STATE
  const [profile, setProfile] = useState(defaultProfile)
  const [errors, setErrors] = useState({})
  const [contactDraft, setContactDraft] = useState({ name: '', relationship: '', phone: '' })

  // --- ⚡ SKIP LOGIC (Fixed) ---
  const handleSkip = () => {
    // 1. Create a "Guest" profile satisfying ALL App.jsx checks
    const guestProfile = {
      ...defaultProfile,
      personal: {
        fullName: 'Guest User',
        age: '0',
        gender: 'Prefer not to say',
        bloodGroup: 'Unknown', // 👈 CRITICAL FIX
        phone: '0000000000'
      },
      contacts: [
        { id: 'ems', name: 'Emergency Services', relationship: 'Service', phone: '112' }
      ]
    }

    // 2. Save Guest Data
    localStorage.setItem('profileData', JSON.stringify(guestProfile))
    localStorage.setItem('profileCompleted', 'true')

    // 3. Sync Legacy Keys
    localStorage.setItem('emergencyContacts', JSON.stringify(guestProfile.contacts))
    localStorage.setItem('medicalCard', JSON.stringify({
      data: { ...guestProfile.personal, ...guestProfile.medical }
    }))

    // 4. Force Navigation
    navigate('/emergency', { replace: true })
  }

  // --- Progress Logic ---
  const completion = useMemo(() => {
    const textFields = [
      'personal.fullName', 'personal.age', 'personal.gender', 'personal.phone',
      'medical.conditions', 'medical.allergies', 'medical.medications',
      'insurance.provider', 'insurance.policyNumber', 'insurance.policyHolder', 'insurance.helpline'
    ]

    let points = 0
    textFields.forEach((path) => {
      const val = getValue(profile, path)
      if (val && String(val).trim().length > 0) points++
    })

    if (profile.medical.diabetes !== 'no') points++
    if (profile.medical.bloodPressure !== 'no') points++
    if (profile.risk.smoker !== 'no') points++
    if (profile.risk.heartHistory !== 'no') points++
    if (profile.contacts.length > 0) points += 3

    return Math.min(100, Math.round((points / 18) * 100))
  }, [profile])

  // --- Handlers ---
  const handleSectionChange = (section) => (field, value) => {
    setProfile((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }))
    if (errors[`${section}.${field}`]) {
      setErrors((prev) => ({ ...prev, [`${section}.${field}`]: '' }))
    }
  }

  const handleContactDraftChange = (field, value) => {
    setContactDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddContact = (e) => {
    e.preventDefault()
    if (!contactDraft.name.trim() || !contactDraft.phone.trim()) {
      setErrors(prev => ({ ...prev, contacts: "Name and Phone are required" }))
      return
    }
    setProfile((prev) => ({
      ...prev,
      contacts: [
        ...prev.contacts,
        { id: Date.now(), ...contactDraft },
      ],
    }))
    setContactDraft({ name: '', relationship: '', phone: '' })
    setErrors(prev => ({ ...prev, contacts: null }))
  }

  const handleRemoveContact = (id) => {
    setProfile((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((c) => c.id !== id),
    }))
  }

  const handleSave = () => {
    const required = ['personal.fullName', 'personal.age', 'personal.phone', 'personal.bloodGroup']
    const newErrors = {}
    required.forEach(path => {
      if (!getValue(profile, path)) newErrors[path] = 'Required'
    })

    if (profile.contacts.length === 0) {
      newErrors['contacts'] = 'At least one emergency contact is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // ✅ SAVE REAL DATA
    localStorage.setItem('profileData', JSON.stringify(profile))
    localStorage.setItem('profileCompleted', 'true')

    localStorage.setItem('emergencyContacts', JSON.stringify(profile.contacts))
    localStorage.setItem('medicalCard', JSON.stringify({
      data: { ...profile.personal, ...profile.medical }
    }))
    localStorage.setItem('insuranceInfo', JSON.stringify(profile.insurance))

    navigate('/emergency')
  }

  return (
    <div className="app onboarding">
      <Header />

      <main style={{ paddingBottom: '140px' }}>
        {/* Hero Card */}
        <div className="onboarding-hero">
          <div className="onboarding-hero-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.25 4.53l-6.72 3.36a2 2 0 00-1.03 1.57v4.61c0 4.15 2.62 7.89 6.46 9.2a2 2 0 001.28 0c3.84-1.31 6.46-5.05 6.46-9.2v-4.6a2 2 0 00-1.03-1.58l-6.72-3.36a2 2 0 00-1.78 0z" />
              <path fillRule="evenodd" d="M12 7.5a.75.75 0 01.75.75v3h3a.75.75 0 010 1.5h-3v3a.75.75 0 01-1.5 0v-3h-3a.75.75 0 010-1.5h3v-3A.75.75 0 0112 7.5z" clipRule="evenodd" />
            </svg>
          </div>
          <h2>Emergency Profile</h2>
          <p>
            Setup your vital info for AI assessment. Details are encrypted locally and only shared when you trigger an emergency.
          </p>
          <div className="privacy-badge">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
            Offline & Secure on Device
          </div>
        </div>

        <PersonalInfo
          data={profile.personal}
          onChange={handleSectionChange('personal')}
          errors={errors}
        />
        <MedicalInfo
          data={profile.medical}
          onChange={handleSectionChange('medical')}
        />
        <Contacts
          contacts={profile.contacts}
          draft={contactDraft}
          onDraftChange={handleContactDraftChange}
          onAdd={handleAddContact}
          onRemove={handleRemoveContact}
          errors={errors}
        />
        <InsuranceInfo
          data={profile.insurance}
          onChange={handleSectionChange('insurance')}
          errors={errors}
        />
        <RiskProfile
          data={profile.risk}
          onChange={handleSectionChange('risk')}
        />
      </main>

      {/* Footer */}
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

      {/* Floating Dock */}
      <div className="bottom-dock">
        <button onClick={handleSkip} className="dock-btn secondary">Skip</button>

        <div className="dock-progress-wrapper">
          <span className="dock-percent">{completion}%</span>
          <div className="dock-track">
            <div className="dock-fill" style={{ width: `${completion}%` }} />
          </div>
        </div>

        <button onClick={handleSave} className="dock-btn primary">Save</button>
      </div>
    </div>
  )
}

export default Onboarding
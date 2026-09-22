import { useCallback, useEffect, useState } from 'react'
import './App.css'

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No visit yet')

const mapPatient = (patient) => ({
  ...patient,
  id: patient.patientId,
  name: patient.fullName,
  sex: patient.gender,
  lastVisit: 'No visit yet',
  status: 'Stable',
  risk: 'Low',
  doctor: 'Care team',
  condition: 'No treatment history yet',
  nextAction: 'Add a treatment record',
})

const mapTreatment = (treatment) => ({
  date: formatDate(treatment.treatmentDate),
  doctor: treatment.doctorName,
  type: treatment.department,
  details: treatment.diagnosis,
  status: treatment.status,
})

const quickActions = ['Add treatment note', 'Schedule visit', 'Print summary', 'Send referral']

function SidebarNav() {
  return (
    <aside className="sidebar">
      <div className="brand-wrap">
        <div className="brand-mark">+</div>
        <div>
          <p className="eyebrow">Clinic system</p>
          <h2>CareFlow</h2>
        </div>
      </div>

      <nav className="nav">
        <button className="nav-item active" type="button">
          Dashboard
        </button>
        <button className="nav-item" type="button">
          Patients
        </button>
        <button className="nav-item" type="button">
          Appointments
        </button>
        <button className="nav-item" type="button">
          Treatments
        </button>
        <button className="nav-item" type="button">
          Reports
        </button>
      </nav>

      <div className="support-card">
        <p>Care team</p>
        <strong>12 clinicians</strong>
        <span>4 new review requests</span>
      </div>
    </aside>
  )
}

function HeaderBar({ onCreatePatient }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Overview</p>
        <h1>Patient treatment dashboard</h1>
      </div>
      <div className="toolbar">
        <div className="search-box">Search patient or record</div>
        <button className="primary-btn" type="button" onClick={onCreatePatient}>
          + New patient
        </button>
      </div>
    </header>
  )
}

function StatsCard({ label, value, change }) {
  return (
    <div className="stat-card">
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{change}</span>
    </div>
  )
}

function PatientTable({ patients, selectedPatient, onSelect }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Patients</h3>
        <button type="button">View all</button>
      </div>

      <div className="patient-list">
        {patients.length === 0 && <p className="empty-state">No patients found in the database.</p>}
        {patients.map((patient) => (
          <button
            key={patient.id}
            type="button"
            className={`patient-row ${selectedPatient.id === patient.id ? 'selected' : ''}`}
            onClick={() => onSelect(patient)}
          >
            <div className="patient-main">
              <div className="avatar">{patient.name.charAt(0)}</div>
              <div>
                <strong>{patient.name}</strong>
                <span>
                  {patient.id} • {patient.age} yrs
                </span>
              </div>
            </div>
            <div className="patient-meta">
              <span className={`badge ${patient.status.toLowerCase().replace(/\s+/g, '-')}`}>
                {patient.status}
              </span>
              <small>{patient.lastVisit}</small>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

function TreatmentHistoryPanel({ patient, treatments }) {
  return (
    <section className="panel panel-large">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Treatment history</p>
          <h3>{patient.name}</h3>
        </div>
        <button type="button">Export</button>
      </div>

      <div className="patient-overview">
        <div>
          <span>Condition</span>
          <strong>{patient.condition}</strong>
        </div>
        <div>
          <span>Doctor</span>
          <strong>{patient.doctor}</strong>
        </div>
        <div>
          <span>Next action</span>
          <strong>{patient.nextAction}</strong>
        </div>
      </div>

      <div className="timeline">
        {treatments.length === 0 && <p className="empty-state">No treatment records for this patient.</p>}
        {treatments.map((item, index) => (
          <div className="timeline-item" key={`${item.date}-${index}`}>
            <div className="timeline-dot" />
            <div className="timeline-content">
              <div className="timeline-head">
                <strong>{item.type}</strong>
                <span className={`status ${item.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  {item.status}
                </span>
              </div>
              <p>{item.date}</p>
              <small>
                {item.doctor} • {item.details}
              </small>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function QuickActionPanel({ patient, onUpdate, onDelete }) {
  return (
    <section className="panel side-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Patient profile</p>
          <h3>{patient.name}</h3>
        </div>
      </div>

      <div className="profile-box">
        <div className="profile-avatar">{patient.name.charAt(0)}</div>
        <div>
          <strong>{patient.id}</strong>
          <span>
            {patient.sex} • {patient.age} years
          </span>
        </div>
      </div>

      <div className="info-grid">
        <div>
          <label>Risk level</label>
          <strong>{patient.risk}</strong>
        </div>
        <div>
          <label>Last visit</label>
          <strong>{patient.lastVisit}</strong>
        </div>
      </div>

      <div className="action-list">
        <button type="button" className="action-btn" onClick={onUpdate}>
          Edit patient
        </button>
        <button type="button" className="action-btn danger-btn" onClick={onDelete}>
          Delete patient
        </button>
        {quickActions.slice(0, 2).map((action) => (
          <button key={action} type="button" className="action-btn">
            {action}
          </button>
        ))}
      </div>
    </section>
  )
}

function LoginScreen({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      if (isRegistering) {
        setIsRegistering(false)
        setPassword('')
        return
      }
      onLogin(data)
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-wrap auth-brand">
          <div className="brand-mark">+</div>
          <div>
            <p className="eyebrow">Clinic system</p>
            <h2>CareFlow</h2>
          </div>
        </div>
        <p className="eyebrow">Secure access</p>
        <h1>{isRegistering ? 'Create your account' : 'Welcome back'}</h1>
        <p className="auth-copy">Use your clinic username and password to access patient records.</p>
        <form className="auth-form" onSubmit={submit}>
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
          </label>
          {error && <p className="error-state">{error}</p>}
          <button className="primary-btn" type="submit">{isRegistering ? 'Create account' : 'Sign in'}</button>
        </form>
        <button className="auth-toggle" type="button" onClick={() => { setIsRegistering(!isRegistering); setError('') }}>
          {isRegistering ? 'Already have an account? Sign in' : 'New to CareFlow? Create an account'}
        </button>
      </section>
    </main>
  )
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('careflow_token'))
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [treatments, setTreatments] = useState([])
  const [error, setError] = useState('')

  const handleLogin = (data) => {
    localStorage.setItem('careflow_token', data.token)
    setToken(data.token)
  }

  const logout = () => {
    localStorage.removeItem('careflow_token')
    setToken(null)
  }

  const request = useCallback(async (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    })
  }, [token])

  const loadPatients = async () => {
    const response = await request('/api/patients')
    if (!response.ok) throw new Error('Unable to load patients')
    const data = (await response.json()).map(mapPatient)
    setPatients(data)
    setSelectedPatient((current) => data.find((patient) => patient.id === current?.id) || data[0] || null)
  }

  useEffect(() => {
    if (!token) return

    request('/api/patients')
      .then((response) => {
        if (response.status === 401) {
          logout()
          throw new Error('Your session has expired')
        }
        if (!response.ok) throw new Error('Unable to load patients')
        return response.json()
      })
      .then((data) => {
        const loadedPatients = data.map(mapPatient)
        setPatients(loadedPatients)
        setSelectedPatient(loadedPatients[0] || null)
      })
      .catch((loadError) => setError(loadError.message))
  }, [request, token])

  useEffect(() => {
    if (!selectedPatient) return

    request(`/api/patients/${selectedPatient.id}/treatments`)
      .then((response) => {
        if (response.status === 401) {
          logout()
          throw new Error('Your session has expired')
        }
        if (!response.ok) throw new Error('Unable to load treatment history')
        return response.json()
      })
      .then((data) => setTreatments(data.map(mapTreatment)))
      .catch((loadError) => setError(loadError.message))
  }, [request, selectedPatient, token])

  const createPatient = async () => {
    const firstName = window.prompt('First name')
    const lastName = window.prompt('Last name')
    if (!firstName || !lastName) return

    try {
      const response = await request('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: `PT-${Date.now().toString().slice(-4)}`,
          firstName,
          lastName,
          age: 0,
          gender: 'Other',
          phone: 'Not provided',
        }),
      })
      if (!response.ok) throw new Error((await response.json()).message)
      await loadPatients()
      setError('')
    } catch (createError) {
      setError(createError.message)
    }
  }

  const updatePatient = async () => {
    const firstName = window.prompt('First name', selectedPatient.firstName)
    const lastName = window.prompt('Last name', selectedPatient.lastName)
    const phone = window.prompt('Phone', selectedPatient.phone)
    if (!firstName || !lastName || !phone) return

    try {
      const response = await request(`/api/patients/${selectedPatient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone }),
      })
      if (!response.ok) throw new Error((await response.json()).message)
      await loadPatients()
      setError('')
    } catch (updateError) {
      setError(updateError.message)
    }
  }

  const deletePatient = async () => {
    if (!window.confirm(`Delete ${selectedPatient.name}?`)) return

    try {
      const response = await request(`/api/patients/${selectedPatient.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error((await response.json()).message)
      await loadPatients()
      setError('')
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  if (!token) return <LoginScreen onLogin={handleLogin} />

  const stats = [
    { label: 'Total patients', value: patients.length, change: 'Database total' },
    { label: 'Active cases', value: patients.length, change: 'Active records' },
    { label: 'Follow-up due', value: treatments.filter((treatment) => treatment.status === 'Follow-up').length, change: 'Selected patient' },
    { label: 'Avg. wait time', value: '—', change: 'Not tracked' },
  ]

  return (
    <div className="clinic-app">
      <SidebarNav />

      <main className="main-panel">
        <HeaderBar onCreatePatient={createPatient} />
        <button className="logout-btn" type="button" onClick={logout}>Sign out</button>

        {error && <p className="error-state">{error}</p>}

        <section className="stats-grid">
          {stats.map((stat) => (
            <StatsCard key={stat.label} label={stat.label} value={stat.value} change={stat.change} />
          ))}
        </section>

        <section className="content-grid">
          {selectedPatient ? <PatientTable patients={patients} selectedPatient={selectedPatient} onSelect={setSelectedPatient} /> : <section className="panel"><p className="empty-state">Add a patient to begin.</p></section>}
          {selectedPatient && <QuickActionPanel patient={selectedPatient} onUpdate={updatePatient} onDelete={deletePatient} />}
        </section>

        {selectedPatient && <TreatmentHistoryPanel patient={selectedPatient} treatments={treatments} />}
      </main>
    </div>
  )
}

export default App

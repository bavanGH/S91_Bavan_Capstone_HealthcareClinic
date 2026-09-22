import { useEffect, useState } from 'react'
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

function App() {
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [treatments, setTreatments] = useState([])
  const [error, setError] = useState('')

  const loadPatients = async () => {
    const response = await fetch('/api/patients')
    if (!response.ok) throw new Error('Unable to load patients')
    const data = (await response.json()).map(mapPatient)
    setPatients(data)
    setSelectedPatient((current) => data.find((patient) => patient.id === current?.id) || data[0] || null)
  }

  useEffect(() => {
    fetch('/api/patients')
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load patients')
        return response.json()
      })
      .then((data) => {
        const loadedPatients = data.map(mapPatient)
        setPatients(loadedPatients)
        setSelectedPatient(loadedPatients[0] || null)
      })
      .catch((loadError) => setError(loadError.message))
  }, [])

  useEffect(() => {
    if (!selectedPatient) return

    fetch(`/api/patients/${selectedPatient.id}/treatments`)
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load treatment history')
        return response.json()
      })
      .then((data) => setTreatments(data.map(mapTreatment)))
      .catch((loadError) => setError(loadError.message))
  }, [selectedPatient])

  const createPatient = async () => {
    const firstName = window.prompt('First name')
    const lastName = window.prompt('Last name')
    if (!firstName || !lastName) return

    try {
      const response = await fetch('/api/patients', {
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
      const response = await fetch(`/api/patients/${selectedPatient.id}`, {
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
      const response = await fetch(`/api/patients/${selectedPatient.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error((await response.json()).message)
      await loadPatients()
      setError('')
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

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

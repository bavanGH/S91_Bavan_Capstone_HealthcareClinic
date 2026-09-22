import { useState } from 'react'
import './App.css'

const patients = [
  {
    id: 'PT-2041',
    name: 'Ava Thompson',
    age: 34,
    sex: 'Female',
    lastVisit: '15 Aug 2026',
    status: 'Follow-up',
    risk: 'Low',
    doctor: 'Dr. Patel',
    condition: 'Seasonal allergy management',
    nextAction: 'Review medication response',
  },
  {
    id: 'PT-1887',
    name: 'Lucas Ramirez',
    age: 41,
    sex: 'Male',
    lastVisit: '11 Aug 2026',
    status: 'Monitoring',
    risk: 'Moderate',
    doctor: 'Dr. Chen',
    condition: 'Post-op recovery',
    nextAction: 'Repeat blood panel',
  },
  {
    id: 'PT-3094',
    name: 'Sophia Lee',
    age: 28,
    sex: 'Female',
    lastVisit: '09 Aug 2026',
    status: 'Stable',
    risk: 'Low',
    doctor: 'Dr. Gomez',
    condition: 'Migraine prevention',
    nextAction: 'Confirm therapy adherence',
  },
  {
    id: 'PT-9912',
    name: 'Noah Brooks',
    age: 52,
    sex: 'Male',
    lastVisit: '08 Aug 2026',
    status: 'Critical review',
    risk: 'High',
    doctor: 'Dr. Patel',
    condition: 'Hypertension follow-up',
    nextAction: 'Escalate to specialist',
  },
]

const stats = [
  { label: 'Total patients', value: '1,248', change: '+12.4%' },
  { label: 'Active cases', value: '186', change: '+8.1%' },
  { label: 'Follow-up due', value: '42', change: '-3.2%' },
  { label: 'Avg. wait time', value: '11 min', change: '-2.0 min' },
]

const treatmentHistory = [
  {
    date: '12 Aug 2026',
    doctor: 'Dr. Patel',
    type: 'Consultation',
    details: 'Reviewed symptoms and adjusted antihistamine dosage.',
    status: 'Completed',
  },
  {
    date: '03 Aug 2026',
    doctor: 'Dr. Chen',
    type: 'Lab review',
    details: 'CBC and thyroid values within expected range.',
    status: 'Completed',
  },
  {
    date: '17 Jul 2026',
    doctor: 'Dr. Gomez',
    type: 'Prescription',
    details: 'Issued 30-day medication plan with hydration guidance.',
    status: 'Completed',
  },
  {
    date: '02 Jul 2026',
    doctor: 'Dr. Patel',
    type: 'Follow-up',
    details: 'Discussed lifestyle adjustments and recovery checklist.',
    status: 'Pending review',
  },
]

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

function HeaderBar() {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Overview</p>
        <h1>Patient treatment dashboard</h1>
      </div>
      <div className="toolbar">
        <div className="search-box">Search patient or record</div>
        <button className="primary-btn" type="button">
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

function PatientTable({ selectedPatient, onSelect }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Patients</h3>
        <button type="button">View all</button>
      </div>

      <div className="patient-list">
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

function TreatmentHistoryPanel({ patient }) {
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
        {treatmentHistory.map((item, index) => (
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

function QuickActionPanel({ patient }) {
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
        {quickActions.map((action) => (
          <button key={action} type="button" className="action-btn">
            {action}
          </button>
        ))}
      </div>
    </section>
  )
}

function App() {
  const [selectedPatient, setSelectedPatient] = useState(patients[0])

  return (
    <div className="clinic-app">
      <SidebarNav />

      <main className="main-panel">
        <HeaderBar />

        <section className="stats-grid">
          {stats.map((stat) => (
            <StatsCard key={stat.label} label={stat.label} value={stat.value} change={stat.change} />
          ))}
        </section>

        <section className="content-grid">
          <PatientTable selectedPatient={selectedPatient} onSelect={setSelectedPatient} />
          <QuickActionPanel patient={selectedPatient} />
        </section>

        <TreatmentHistoryPanel patient={selectedPatient} />
      </main>
    </div>
  )
}

export default App

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  formatDate,
  formatFileSize,
  getApiErrorMessage,
  getContentType,
  getDocumentType,
  mapPatient,
  mapTreatment,
  parseApiJson,
} from './utils/careflowUtils'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const apiUrl = (path) => `${API_BASE_URL}${path}`

const generatePatientId = (patients = [], excludedId = '') => {
  const existingIds = new Set(patients.flatMap((patient) => [patient.patientId, patient.id]))
  existingIds.add(excludedId)

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const randomValue = new Uint32Array(1)
    window.crypto.getRandomValues(randomValue)
    const patientId = `PT-${String((randomValue[0] % 900000) + 100000)}`
    if (!existingIds.has(patientId)) return patientId
  }

  throw new Error('Unable to generate a unique patient ID. Please try again.')
}

function SidebarNav({ activeSection, onNavigate }) {
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
        <button
          className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
          type="button"
          aria-current={activeSection === 'dashboard' ? 'location' : undefined}
          onClick={() => onNavigate('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`nav-item ${activeSection === 'patients' ? 'active' : ''}`}
          type="button"
          aria-current={activeSection === 'patients' ? 'location' : undefined}
          onClick={() => onNavigate('patients')}
        >
          Patients
        </button>
        <button
          className={`nav-item ${activeSection === 'treatments' ? 'active' : ''}`}
          type="button"
          aria-current={activeSection === 'treatments' ? 'location' : undefined}
          onClick={() => onNavigate('treatments')}
        >
          Treatments
        </button>
      </nav>

    </aside>
  )
}

function HeaderBar({ onCreatePatient, onLogout, searchText, onSearchChange }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Overview</p>
        <h1>Patient treatment dashboard</h1>
      </div>
      <div className="toolbar">
        <input
          className="search-box"
          type="search"
          aria-label="Search patients"
          placeholder="Search by name, ID, phone or email"
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <div className="header-actions">
          <button className="primary-btn" type="button" onClick={onCreatePatient}>
            + New patient
          </button>
          <button className="logout-btn" type="button" onClick={onLogout}>Sign out</button>
        </div>
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

function PatientTable({ patients, selectedPatient, onSelect, searchText }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Patients</h3>
      </div>

      <div className="patient-list">
        {patients.length === 0 && (
          <p className="empty-state">
            {searchText.trim() ? 'No patients found.' : 'No patients found in the database.'}
          </p>
        )}
        {patients.map((patient) => (
          <button
            key={patient.id}
            type="button"
            className={`patient-row ${selectedPatient?.id === patient.id ? 'selected' : ''}`}
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
              <small>Last visit: {patient.lastVisit}</small>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

function TreatmentHistoryPanel({ patient, treatments, status, error, onRetry, onSelectTreatment }) {
  return (
    <section className="panel panel-large" id="treatment-history-section">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Treatment history</p>
          <h3>{patient.name}</h3>
        </div>
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
        {status === 'loading' && <p className="loading-state" role="status">Loading treatment history...</p>}
        {status === 'error' && (
          <div className="panel-error" role="alert">
            <p>Unable to load treatment history: {error}</p>
            <button type="button" className="retry-btn" onClick={onRetry}>Retry</button>
          </div>
        )}
        {status === 'success' && treatments.length === 0 && (
          <p className="empty-state">No treatment records for this patient.</p>
        )}
        {status === 'success' && treatments.map((item) => (
          <button
            className="timeline-item timeline-item-button"
            key={item.id}
            type="button"
            aria-label={`View treatment details: ${item.type}, ${item.date}`}
            onClick={() => onSelectTreatment(item.id)}
          >
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
          </button>
        ))}
      </div>
    </section>
  )
}

function TreatmentDetailsModal({ treatment, status, error, successMessage, onClose, onRetry, onEdit }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="treatment-modal treatment-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="treatment-details-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Treatment record</p>
            <h2 id="treatment-details-title">Treatment details</h2>
          </div>
          <div className="modal-header-actions">
            {treatment && status !== 'loading' && (
              <button className="secondary-btn" type="button" onClick={onEdit}>Edit treatment</button>
            )}
            <button className="modal-close" type="button" onClick={onClose} aria-label="Close treatment details">
              ×
            </button>
          </div>
        </div>

        <div className="treatment-details-content">
          {successMessage && <p className="success-state modal-message" role="status">{successMessage}</p>}
          {status === 'loading' && (
            <p className="loading-state" role="status">Loading treatment details...</p>
          )}
          {status === 'error' && (
            <div className="panel-error" role="alert">
              <p>Unable to load treatment details: {error}</p>
              <button type="button" className="retry-btn" onClick={onRetry}>Retry</button>
            </div>
          )}
          {treatment && status !== 'idle' && (
            <>
              <div className="treatment-detail-grid">
                <div className="treatment-detail-card">
                  <span className="treatment-detail-label">Doctor</span>
                  <strong>{treatment.doctorName || 'Not provided'}</strong>
                </div>
                <div className="treatment-detail-card">
                  <span className="treatment-detail-label">Department</span>
                  <strong>{treatment.department || 'Not provided'}</strong>
                </div>
                <div className="treatment-detail-card">
                  <span className="treatment-detail-label">Treatment date</span>
                  <strong>{formatDate(treatment.treatmentDate)}</strong>
                </div>
                <div className="treatment-detail-card">
                  <span className="treatment-detail-label">Status</span>
                  <strong>{treatment.status || 'Not provided'}</strong>
                </div>
                <div className="treatment-detail-card treatment-detail-wide">
                  <span className="treatment-detail-label">Diagnosis</span>
                  <p>{treatment.diagnosis || 'No diagnosis recorded.'}</p>
                </div>
                <div className="treatment-detail-card treatment-detail-wide">
                  <span className="treatment-detail-label">Treatment plan</span>
                  <p>{treatment.treatmentPlan || 'No treatment plan recorded.'}</p>
                </div>
                <div className="treatment-detail-card treatment-detail-wide">
                  <span className="treatment-detail-label">Medications</span>
                  {Array.isArray(treatment.medications) && treatment.medications.length > 0 ? (
                    <ul className="treatment-medication-list">
                      {treatment.medications.map((medication, index) => (
                        <li key={`${medication.name || 'medication'}-${index}`}>
                          <strong>{medication.name || 'Name not provided'}</strong>
                          <span>Dosage: {medication.dosage || 'Not provided'}</span>
                          <span>Frequency: {medication.frequency || 'Not provided'}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No medications recorded.</p>
                  )}
                </div>
                <div className="treatment-detail-card treatment-detail-wide">
                  <span className="treatment-detail-label">Additional notes</span>
                  <p>{treatment.notes || 'No additional notes.'}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function EditTreatmentModal({ treatment, patient, onClose, onSubmit, onSuggestNotes }) {
  const [form, setForm] = useState(() => ({
    doctorName: treatment.doctorName || '',
    department: treatment.department || '',
    treatmentDate: treatment.treatmentDate ? new Date(treatment.treatmentDate).toISOString().slice(0, 10) : '',
    diagnosis: treatment.diagnosis || '',
    treatmentPlan: treatment.treatmentPlan || '',
    medications: Array.isArray(treatment.medications)
      ? treatment.medications.map((medication) => ({
        name: medication.name || '',
        dosage: medication.dosage || '',
        frequency: medication.frequency || '',
      }))
      : [],
    notes: treatment.notes || '',
    status: treatment.status || 'Pending',
  }))
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submissionInProgress = useRef(false)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submissionInProgress.current) onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFormError('')
  }

  const updateMedication = (index, field, value) => {
    setForm((current) => ({
      ...current,
      medications: current.medications.map((medication, medicationIndex) =>
        medicationIndex === index ? { ...medication, [field]: value } : medication,
      ),
    }))
    setFormError('')
  }

  const addMedication = () => {
    setForm((current) => ({
      ...current,
      medications: [...current.medications, { name: '', dosage: '', frequency: '' }],
    }))
  }

  const removeMedication = (index) => {
    setForm((current) => ({
      ...current,
      medications: current.medications.filter((_medication, medicationIndex) => medicationIndex !== index),
    }))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (submissionInProgress.current) return

    const requiredFields = {
      doctorName: 'Doctor name',
      department: 'Department',
      treatmentDate: 'Treatment date',
      diagnosis: 'Diagnosis',
      treatmentPlan: 'Treatment plan',
    }
    const missingField = Object.entries(requiredFields).find(([field]) => !form[field].trim())
    if (missingField) {
      setFormError(`${missingField[1]} is required.`)
      return
    }

    submissionInProgress.current = true
    setIsSubmitting(true)
    setFormError('')
    try {
      await onSubmit({
        doctorName: form.doctorName.trim(),
        department: form.department.trim(),
        treatmentDate: form.treatmentDate,
        diagnosis: form.diagnosis.trim(),
        treatmentPlan: form.treatmentPlan.trim(),
        medications: form.medications.filter((medication) =>
          medication.name.trim() || medication.dosage.trim() || medication.frequency.trim(),
        ).map((medication) => ({
          name: medication.name.trim(),
          dosage: medication.dosage.trim(),
          frequency: medication.frequency.trim(),
        })),
        notes: form.notes.trim(),
        status: form.status,
      })
      onClose()
    } catch (submitError) {
      setFormError(submitError.message)
    } finally {
      submissionInProgress.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose()
      }}
    >
      <section
        className="treatment-modal edit-treatment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-treatment-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Treatment record</p>
            <h2 id="edit-treatment-title">Edit treatment</h2>
            <span>{patient.name} • {patient.id}</span>
          </div>
          <button className="modal-close" type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close">
            ×
          </button>
        </div>

        <form className="treatment-form" onSubmit={submit}>
          <div className="treatment-patient-readonly">
            <span>Patient association</span>
            <strong>{patient.name} • {patient.id}</strong>
          </div>

          <div className="form-grid">
            <label>
              Doctor name <span aria-hidden="true">*</span>
              <input value={form.doctorName} onChange={(event) => updateField('doctorName', event.target.value)} required disabled={isSubmitting} />
            </label>
            <label>
              Department <span aria-hidden="true">*</span>
              <input value={form.department} onChange={(event) => updateField('department', event.target.value)} required disabled={isSubmitting} />
            </label>
            <label>
              Treatment date <span aria-hidden="true">*</span>
              <input type="date" value={form.treatmentDate} onChange={(event) => updateField('treatmentDate', event.target.value)} required disabled={isSubmitting} />
            </label>
            <label>
              Status
              <select value={form.status} onChange={(event) => updateField('status', event.target.value)} disabled={isSubmitting}>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Follow-up">Follow-up</option>
              </select>
            </label>
          </div>

          <label>
            Diagnosis <span aria-hidden="true">*</span>
            <textarea value={form.diagnosis} onChange={(event) => updateField('diagnosis', event.target.value)} required disabled={isSubmitting} />
          </label>
          <label>
            Treatment plan <span aria-hidden="true">*</span>
            <textarea value={form.treatmentPlan} onChange={(event) => updateField('treatmentPlan', event.target.value)} required disabled={isSubmitting} />
          </label>

          <div className="medications-section">
            <div className="medications-heading">
              <strong>Medications</strong>
              <button className="secondary-btn" type="button" onClick={addMedication} disabled={isSubmitting}>
                + Add medication
              </button>
            </div>
            {form.medications.map((medication, index) => (
              <div className="medication-row" key={index}>
                <label>
                  Name
                  <input value={medication.name} onChange={(event) => updateMedication(index, 'name', event.target.value)} disabled={isSubmitting} />
                </label>
                <label>
                  Dosage
                  <input value={medication.dosage} onChange={(event) => updateMedication(index, 'dosage', event.target.value)} disabled={isSubmitting} />
                </label>
                <label>
                  Frequency
                  <input value={medication.frequency} onChange={(event) => updateMedication(index, 'frequency', event.target.value)} disabled={isSubmitting} />
                </label>
                <button
                  className="remove-medication"
                  type="button"
                  onClick={() => removeMedication(index)}
                  disabled={isSubmitting}
                  aria-label={`Remove medication ${index + 1}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <label>
            Notes
            <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} disabled={isSubmitting} />
          </label>
          <NotesSuggestionAssistant
            draftText={form.notes}
            disabled={isSubmitting}
            onSuggest={onSuggestNotes}
            onAccept={(text) => updateField('notes', text)}
          />

          {formError && <p className="error-state modal-message" role="alert">{formError}</p>}

          <div className="modal-actions">
            <button className="cancel-btn" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving treatment...' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function NotesSuggestionAssistant({ draftText, disabled, onSuggest, onAccept }) {
  const [suggestionResult, setSuggestionResult] = useState(null)
  const [errorResult, setErrorResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [confirmedDraft, setConfirmedDraft] = useState('')
  const requestInProgress = useRef(false)
  const isMounted = useRef(false)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const suggestion = suggestionResult?.draftText === draftText ? suggestionResult.text : ''
  const error = errorResult?.draftText === draftText ? errorResult.message : ''
  const privacyConfirmed = confirmedDraft === draftText

  const requestSuggestion = async () => {
    if (requestInProgress.current || disabled || !draftText.trim() || !privacyConfirmed) return

    requestInProgress.current = true
    setIsLoading(true)
    setSuggestionResult(null)
    setErrorResult(null)
    try {
      const text = await onSuggest(draftText)
      if (isMounted.current) setSuggestionResult({ draftText, text })
    } catch (requestError) {
      if (isMounted.current) {
        setErrorResult({
          draftText,
          message: requestError instanceof Error ? requestError.message : 'Unable to generate a suggestion.',
        })
      }
    } finally {
      requestInProgress.current = false
      if (isMounted.current) setIsLoading(false)
    }
  }

  const acceptSuggestion = () => {
    onAccept(suggestion)
    setSuggestionResult(null)
  }

  return (
    <div className="notes-suggestion">
      <p className="notes-suggestion-privacy">
        Only this draft is sent to Gemini. Do not include patient names, IDs, diagnoses, or medical-record details.
      </p>
      <label className="notes-suggestion-confirmation">
        <input
          type="checkbox"
          checked={privacyConfirmed}
          onChange={(event) => setConfirmedDraft(event.target.checked ? draftText : '')}
          disabled={disabled || isLoading || !draftText.trim()}
        />
        <span>I confirm this draft is de-identified and contains no patient names, IDs, diagnoses, or medical-record details.</span>
      </label>
      <button
        className="secondary-btn"
        type="button"
        onClick={requestSuggestion}
        disabled={disabled || isLoading || !draftText.trim() || !privacyConfirmed}
      >
        {isLoading ? 'Generating suggestion...' : 'AI Suggest'}
      </button>
      {error && <p className="error-state modal-message" role="alert">{error}</p>}
      {suggestion && (
        <div className="notes-suggestion-result" role="status" aria-live="polite">
          <p>{suggestion}</p>
          <div className="notes-suggestion-actions">
            <button className="secondary-btn" type="button" onClick={acceptSuggestion} disabled={disabled}>
              Accept
            </button>
            <button className="cancel-btn" type="button" onClick={() => setSuggestionResult(null)} disabled={disabled}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DocumentPreviewModal({ preview, onClose, onRetry }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const documentType = getDocumentType(preview.mimeType)
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="treatment-modal document-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-preview-title"
      >
        <div className="modal-header">
          <div className="document-preview-heading">
            <p className="eyebrow">{documentType.name}</p>
            <h2 id="document-preview-title" title={preview.originalName}>{preview.originalName}</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close preview">
            ×
          </button>
        </div>
        <div className="document-preview-content">
          {preview.status === 'loading' && (
            <p className="loading-state" role="status">Loading preview...</p>
          )}
          {preview.status === 'error' && (
            <div className="panel-error" role="alert">
              <p>{preview.error}</p>
              <button type="button" className="retry-btn" onClick={onRetry}>Retry</button>
            </div>
          )}
          {preview.status === 'success' && preview.url && preview.mimeType === 'application/pdf' && (
            <iframe className="document-pdf-frame" src={preview.url} title={`Preview of ${preview.originalName}`} />
          )}
          {preview.status === 'success' && preview.url && ['image/jpeg', 'image/png'].includes(preview.mimeType) && (
            <img className="document-image-preview" src={preview.url} alt={`Preview of ${preview.originalName}`} />
          )}
          {preview.status === 'success' && !documentType.previewable && (
            <p className="empty-state">Preview is not available for this file type.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function DeleteDocumentModal({ document, patient, onClose, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const deletionInProgress = useRef(false)

  const confirmDelete = async () => {
    if (deletionInProgress.current) return

    deletionInProgress.current = true
    setIsDeleting(true)
    setError('')
    let deleted = false
    try {
      await onConfirm()
      deleted = true
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      deletionInProgress.current = false
      if (!deleted) setIsDeleting(false)
    }
    if (deleted) onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isDeleting) onClose()
    }}>
      <section className="treatment-modal delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-document-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Patient documents</p>
            <h2 id="delete-document-title">Delete document?</h2>
            <span>This document will be removed from the patient record.</span>
          </div>
          <button className="modal-close" type="button" onClick={onClose} disabled={isDeleting} aria-label="Close">
            ×
          </button>
        </div>
        <div className="delete-modal-content">
          <div className="delete-patient-summary">
            <strong>{document.originalName}</strong>
            <span>{patient.name} · {patient.id}</span>
          </div>
          {error && <p className="error-state modal-message" role="alert">{error}</p>}
          <div className="modal-actions">
            <button className="cancel-btn" type="button" onClick={onClose} disabled={isDeleting}>
              Cancel
            </button>
            <button className="delete-confirm-btn" type="button" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting document...' : 'Delete document'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function QuickActionPanel({
  patient,
  documents,
  documentsStatus,
  documentsError,
  onRetryDocuments,
  isUploadingDocument,
  documentActionMessage,
  uploadMessage,
  onUpdate,
  onDelete,
  onUpload,
  onAddTreatment,
  onPreviewDocument,
  onDeleteDocument,
}) {
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
        <button type="button" className="action-btn" onClick={onAddTreatment}>
          Add treatment note
        </button>
      </div>

      <div className="documents-box">
        <div className="documents-heading">
          <strong>Patient documents</strong>
          <label className={`upload-btn ${isUploadingDocument ? 'uploading' : ''}`}>
            {isUploadingDocument ? 'Uploading...' : 'Upload'}
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,text/plain"
              disabled={isUploadingDocument}
              onChange={(event) => {
                const file = event.target.files[0]
                event.target.value = ''
                onUpload(file)
              }}
            />
          </label>
        </div>
        {uploadMessage?.text && (
          <p className={`${uploadMessage.type}-state document-message`} role={uploadMessage.type === 'error' ? 'alert' : 'status'}>
            {uploadMessage.text}
          </p>
        )}
        {documentActionMessage?.text && (
          <p className={`${documentActionMessage.type}-state document-message`} role={documentActionMessage.type === 'error' ? 'alert' : 'status'}>
            {documentActionMessage.text}
          </p>
        )}
        {documentsStatus === 'loading' && <span className="documents-empty" role="status">Loading documents...</span>}
        {documentsStatus === 'error' && (
          <div className="panel-error document-fetch-error" role="alert">
            <span>{documentsError}</span>
            <button type="button" className="retry-btn" onClick={onRetryDocuments} disabled={isUploadingDocument}>Retry</button>
          </div>
        )}
        {documentsStatus === 'success' && documents.length === 0 && (
          <span className="documents-empty">No documents uploaded for this patient.</span>
        )}
        {documentsStatus === 'success' && documents.length > 0 && (
          <div className="documents-list">
            {documents.map((document) => {
              const documentType = getDocumentType(document.mimeType)
              return (
                <article className="document-row" key={document._id}>
                  <div className="document-summary">
                    <span className="document-type-icon" aria-hidden="true">{documentType.label}</span>
                    <div className="document-metadata">
                      <strong title={document.originalName}>{document.originalName}</strong>
                      <small>{formatFileSize(document.size)} · {documentType.name}</small>
                    </div>
                  </div>
                  <div className="document-actions">
                    <button
                      type="button"
                      onClick={() => onPreviewDocument(patient, document)}
                      disabled={!documentType.previewable}
                      title={documentType.previewable ? 'Preview document' : 'Preview is not available for this file type'}
                    >
                      {documentType.previewable ? 'Preview' : 'No preview'}
                    </button>
                    <button
                      className="document-delete-action"
                      type="button"
                      onClick={() => onDeleteDocument(patient, document)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
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
      const response = await fetch(apiUrl(endpoint), {
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
        <div className="auth-intro">
          <p className="eyebrow">Secure access</p>
          <h1>{isRegistering ? 'Create your account' : 'Welcome back'}</h1>
          <p className="auth-copy">Use your clinic username and password to access patient records.</p>
        </div>
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
        <div className="auth-divider"><span>or</span></div>
        <a className="google-btn" href={apiUrl('/api/auth/google')}>
          Continue with Google
        </a>
        <button className="auth-toggle" type="button" onClick={() => { setIsRegistering(!isRegistering); setError('') }}>
          {isRegistering ? 'Already have an account? Sign in' : 'New to CareFlow? Create an account'}
        </button>
      </section>
      <aside className="auth-visual" aria-labelledby="auth-visual-title">
        <div className="auth-visual-brand">
          <span className="auth-visual-mark" aria-hidden="true">+</span>
          <span>CareFlow</span>
          <span className="auth-visual-label">Healthcare management</span>
        </div>
        <div className="auth-illustration">
          <svg
            viewBox="0 0 560 430"
            role="img"
            aria-labelledby="careflow-illustration-title"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title id="careflow-illustration-title">Illustration of connected healthcare records</title>
            <circle cx="280" cy="210" r="180" fill="#dbeafe" opacity=".62" />
            <circle cx="280" cy="210" r="145" fill="#eff6ff" />
            <ellipse cx="282" cy="376" rx="188" ry="20" fill="#102a43" opacity=".08" />
            <rect x="91" y="58" width="378" height="292" rx="24" fill="#fff" stroke="#dbe5f1" strokeWidth="2" />
            <rect x="110" y="77" width="56" height="254" rx="16" fill="#102a43" />
            <rect x="128" y="95" width="20" height="20" rx="6" fill="#eaf2ff" />
            <path d="M138 99v12m-6-6h12" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
            <rect x="126" y="139" width="24" height="7" rx="3.5" fill="#93c5fd" />
            <rect x="126" y="161" width="24" height="7" rx="3.5" fill="#64748b" />
            <rect x="126" y="183" width="24" height="7" rx="3.5" fill="#64748b" />
            <rect x="126" y="205" width="24" height="7" rx="3.5" fill="#64748b" />
            <text x="188" y="105" fill="#102a43" fontFamily="Manrope, sans-serif" fontSize="16" fontWeight="700">Patient overview</text>
            <text x="188" y="124" fill="#64748b" fontFamily="Inter, sans-serif" fontSize="10">Care information, clearly connected</text>
            <rect x="187" y="143" width="254" height="78" rx="15" fill="#f4f7fb" />
            <circle cx="218" cy="182" r="19" fill="#dbeafe" />
            <circle cx="218" cy="176" r="6" fill="#2563eb" />
            <path d="M207 194c1.8-7 6.1-10 11-10s9.2 3 11 10" fill="#2563eb" />
            <rect x="250" y="166" width="108" height="8" rx="4" fill="#102a43" opacity=".82" />
            <rect x="250" y="183" width="73" height="6" rx="3" fill="#94a3b8" />
            <rect x="250" y="198" width="48" height="6" rx="3" fill="#cbd5e1" />
            <rect x="187" y="236" width="116" height="78" rx="14" fill="#eaf2ff" />
            <rect x="316" y="236" width="125" height="78" rx="14" fill="#f8fafc" stroke="#e2e8f0" />
            <circle cx="211" cy="259" r="9" fill="#2563eb" opacity=".14" />
            <path d="M211 254v10m-5-5h10" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
            <rect x="228" y="256" width="54" height="5" rx="2.5" fill="#64748b" />
            <path d="M199 291h12l7-13 9 23 8-15h14" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="332" y="254" width="76" height="6" rx="3" fill="#64748b" />
            <rect x="332" y="270" width="92" height="6" rx="3" fill="#cbd5e1" />
            <rect x="332" y="286" width="63" height="6" rx="3" fill="#cbd5e1" />
            <rect x="365" y="37" width="104" height="48" rx="14" fill="#fff" stroke="#dbe5f1" strokeWidth="2" />
            <circle cx="389" cy="61" r="11" fill="#dcfce7" />
            <path d="m384 61 3.5 3.5L394 57" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="408" y="57" width="46" height="7" rx="3.5" fill="#102a43" opacity=".72" />
            <rect x="58" y="266" width="83" height="52" rx="15" fill="#fff" stroke="#dbe5f1" strokeWidth="2" />
            <path d="M77 292h9l5-9 7 17 6-12h11" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="464" cy="293" r="22" fill="#2563eb" />
            <path d="M464 282v22m-11-11h22" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
        <div className="auth-visual-copy">
          <p className="eyebrow">Care, connected</p>
          <h2 id="auth-visual-title">A clearer view of every patient journey.</h2>
          <p>Keep patient records and treatment history together, so your care team can focus on what matters.</p>
        </div>
      </aside>
    </main>
  )
}

function AddTreatmentModal({ patient, onClose, onSubmit, onSuggestNotes }) {
  const [form, setForm] = useState({
    doctorName: '',
    department: '',
    treatmentDate: new Date().toISOString().slice(0, 10),
    diagnosis: '',
    treatmentPlan: '',
    medications: [],
    notes: '',
    status: 'Pending',
  })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const updateMedication = (index, field, value) => {
    setForm((current) => ({
      ...current,
      medications: current.medications.map((medication, medicationIndex) =>
        medicationIndex === index ? { ...medication, [field]: value } : medication,
      ),
    }))
  }

  const addMedication = () => {
    setForm((current) => ({
      ...current,
      medications: [...current.medications, { name: '', dosage: '', frequency: '' }],
    }))
  }

  const removeMedication = (index) => {
    setForm((current) => ({
      ...current,
      medications: current.medications.filter((_medication, medicationIndex) => medicationIndex !== index),
    }))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    const requiredFields = {
      doctorName: 'Doctor name',
      department: 'Department',
      treatmentDate: 'Treatment date',
      diagnosis: 'Diagnosis',
      treatmentPlan: 'Treatment plan',
    }
    const missingField = Object.entries(requiredFields).find(([field]) => !form[field].trim())
    if (missingField) {
      setFormError(`${missingField[1]} is required.`)
      return
    }

    setFormError('')
    setIsSubmitting(true)
    try {
      await onSubmit({
        ...form,
        doctorName: form.doctorName.trim(),
        department: form.department.trim(),
        diagnosis: form.diagnosis.trim(),
        treatmentPlan: form.treatmentPlan.trim(),
        notes: form.notes.trim(),
        medications: form.medications.filter((medication) =>
          medication.name.trim() || medication.dosage.trim() || medication.frequency.trim(),
        ).map((medication) => ({
          name: medication.name.trim(),
          dosage: medication.dosage.trim(),
          frequency: medication.frequency.trim(),
        })),
      })
    } catch (submitError) {
      setFormError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSubmitting) onClose()
    }}>
      <section className="treatment-modal" role="dialog" aria-modal="true" aria-labelledby="treatment-modal-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Selected patient</p>
            <h2 id="treatment-modal-title">Add treatment record</h2>
            <span>{patient.name} • {patient.id}</span>
          </div>
          <button className="modal-close" type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close">
            ×
          </button>
        </div>

        <form className="treatment-form" onSubmit={submit}>
          <div className="form-grid">
            <label>
              Doctor name <span aria-hidden="true">*</span>
              <input value={form.doctorName} onChange={(event) => updateField('doctorName', event.target.value)} required />
            </label>
            <label>
              Department <span aria-hidden="true">*</span>
              <input value={form.department} onChange={(event) => updateField('department', event.target.value)} required />
            </label>
            <label>
              Treatment date <span aria-hidden="true">*</span>
              <input type="date" value={form.treatmentDate} onChange={(event) => updateField('treatmentDate', event.target.value)} required />
            </label>
            <label>
              Status
              <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Follow-up">Follow-up</option>
              </select>
            </label>
          </div>

          <label>
            Diagnosis <span aria-hidden="true">*</span>
            <textarea value={form.diagnosis} onChange={(event) => updateField('diagnosis', event.target.value)} required />
          </label>
          <label>
            Treatment plan <span aria-hidden="true">*</span>
            <textarea value={form.treatmentPlan} onChange={(event) => updateField('treatmentPlan', event.target.value)} required />
          </label>

          <div className="medications-section">
            <div className="medications-heading">
              <strong>Medications</strong>
              <button className="secondary-btn" type="button" onClick={addMedication} disabled={isSubmitting}>
                + Add medication
              </button>
            </div>
            {form.medications.map((medication, index) => (
              <div className="medication-row" key={index}>
                <label>
                  Name
                  <input value={medication.name} onChange={(event) => updateMedication(index, 'name', event.target.value)} />
                </label>
                <label>
                  Dosage
                  <input value={medication.dosage} onChange={(event) => updateMedication(index, 'dosage', event.target.value)} />
                </label>
                <label>
                  Frequency
                  <input value={medication.frequency} onChange={(event) => updateMedication(index, 'frequency', event.target.value)} />
                </label>
                <button
                  className="remove-medication"
                  type="button"
                  onClick={() => removeMedication(index)}
                  disabled={isSubmitting}
                  aria-label={`Remove medication ${index + 1}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <label>
            Notes
            <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} />
          </label>
          <NotesSuggestionAssistant
            draftText={form.notes}
            disabled={isSubmitting}
            onSuggest={onSuggestNotes}
            onAccept={(text) => updateField('notes', text)}
          />

          {formError && <p className="error-state modal-message">{formError}</p>}

          <div className="modal-actions">
            <button className="cancel-btn" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving treatment...' : 'Add treatment'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function PatientFormModal({ patient, patients, onClose, onSubmit }) {
  const isEditing = Boolean(patient)
  const [form, setForm] = useState(() => ({
    patientId: patient?.patientId || patient?.id || generatePatientId(patients),
    firstName: patient?.firstName || '',
    lastName: patient?.lastName || '',
    age: patient ? String(patient.age ?? '') : '',
    gender: patient?.gender || '',
    phone: patient?.phone || '',
    email: patient?.email || '',
    address: patient?.address || '',
    bloodGroup: patient?.bloodGroup || '',
    allergies: Array.isArray(patient?.allergies) ? patient.allergies.join(', ') : '',
  }))
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submissionInProgress = useRef(false)

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
    setSubmitError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (submissionInProgress.current) return

    const errors = {}
    if (!form.patientId.trim()) errors.patientId = 'Patient ID is required.'
    if (!form.firstName.trim()) errors.firstName = 'First name is required.'
    if (!form.lastName.trim()) errors.lastName = 'Last name is required.'
    if (!form.age.trim()) errors.age = 'Age is required.'
    else if (!Number.isFinite(Number(form.age)) || Number(form.age) < 0) errors.age = 'Enter a valid age of 0 or greater.'
    if (!form.gender) errors.gender = 'Select a gender.'
    if (!form.phone.trim()) errors.phone = 'Phone number is required.'
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Enter a valid email address.'
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    submissionInProgress.current = true
    setIsSubmitting(true)
    setSubmitError('')
    try {
      await onSubmit({
        patientId: form.patientId.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        age: Number(form.age),
        gender: form.gender,
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        bloodGroup: form.bloodGroup.trim(),
        allergies: form.allergies.split(',').map((allergy) => allergy.trim()).filter(Boolean),
      })
    } catch (error) {
      if (!isEditing && /patient id.*already exists|duplicate key/i.test(error.message)) {
        try {
          setForm((current) => ({
            ...current,
            patientId: generatePatientId(patients, form.patientId),
          }))
          setSubmitError('That patient ID was already in use. A new ID has been generated; submit again.')
        } catch (idError) {
          setSubmitError(idError.message)
        }
      } else {
        setSubmitError(error.message)
      }
    } finally {
      submissionInProgress.current = false
      setIsSubmitting(false)
    }
  }

  const fieldProps = (field) => ({
    'aria-invalid': Boolean(fieldErrors[field]),
    'aria-describedby': fieldErrors[field] ? `patient-${field}-error` : undefined,
  })

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSubmitting) onClose()
    }}>
      <section className="treatment-modal patient-modal" role="dialog" aria-modal="true" aria-labelledby="patient-modal-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Patient management</p>
            <h2 id="patient-modal-title">{isEditing ? 'Edit patient' : 'Add new patient'}</h2>
            <span>Fields marked * are required.</span>
          </div>
          <button className="modal-close" type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close">
            ×
          </button>
        </div>

        <form className="patient-form" onSubmit={submit} noValidate>
          <div className="patient-form-grid">
            <label>
              Patient ID *
              <input value={form.patientId} readOnly {...fieldProps('patientId')} />
              <small>{isEditing ? 'Patient ID cannot be changed' : 'Automatically generated unique ID'}</small>
              {fieldErrors.patientId && <span className="field-error" id="patient-patientId-error">{fieldErrors.patientId}</span>}
            </label>
            <label>
              First name *
              <input value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} {...fieldProps('firstName')} />
              {fieldErrors.firstName && <span className="field-error" id="patient-firstName-error">{fieldErrors.firstName}</span>}
            </label>
            <label>
              Last name *
              <input value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} {...fieldProps('lastName')} />
              {fieldErrors.lastName && <span className="field-error" id="patient-lastName-error">{fieldErrors.lastName}</span>}
            </label>
            <label>
              Age *
              <input type="number" min="0" step="any" value={form.age} onChange={(event) => updateField('age', event.target.value)} {...fieldProps('age')} />
              {fieldErrors.age && <span className="field-error" id="patient-age-error">{fieldErrors.age}</span>}
            </label>
            <label>
              Gender *
              <select value={form.gender} onChange={(event) => updateField('gender', event.target.value)} {...fieldProps('gender')}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {fieldErrors.gender && <span className="field-error" id="patient-gender-error">{fieldErrors.gender}</span>}
            </label>
            <label>
              Phone *
              <input type="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} {...fieldProps('phone')} />
              {fieldErrors.phone && <span className="field-error" id="patient-phone-error">{fieldErrors.phone}</span>}
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} {...fieldProps('email')} />
              {fieldErrors.email && <span className="field-error" id="patient-email-error">{fieldErrors.email}</span>}
            </label>
            <label>
              Blood group
              <input value={form.bloodGroup} onChange={(event) => updateField('bloodGroup', event.target.value)} />
            </label>
            <label className="patient-field-wide">
              Address
              <textarea value={form.address} onChange={(event) => updateField('address', event.target.value)} />
            </label>
            <label className="patient-field-wide">
              Allergies
              <input
                value={form.allergies}
                onChange={(event) => updateField('allergies', event.target.value)}
                placeholder="Separate multiple allergies with commas"
              />
            </label>
          </div>

          {submitError && <p className="error-state modal-message" role="alert">{submitError}</p>}

          <div className="modal-actions">
            <button className="cancel-btn" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving patient...' : isEditing ? 'Save changes' : 'Create patient'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function DeletePatientModal({ patient, onClose, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const deletionInProgress = useRef(false)

  const confirmDelete = async () => {
    if (deletionInProgress.current) return

    deletionInProgress.current = true
    setIsDeleting(true)
    setError('')
    let deleted = false
    try {
      await onConfirm()
      deleted = true
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      deletionInProgress.current = false
      if (!deleted) setIsDeleting(false)
    }
    if (deleted) onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isDeleting) onClose()
    }}>
      <section className="treatment-modal delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-patient-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Patient management</p>
            <h2 id="delete-patient-title">Delete patient?</h2>
            <span>This action removes the patient from your active patient list.</span>
          </div>
          <button className="modal-close" type="button" onClick={onClose} disabled={isDeleting} aria-label="Close">
            ×
          </button>
        </div>

        <div className="delete-modal-content">
          <div className="delete-patient-summary">
            <strong>{patient.name}</strong>
            <span>Patient ID: {patient.id}</span>
          </div>
          <p>The patient record will be deactivated and will no longer appear in the active patient list.</p>
          {error && <p className="error-state modal-message" role="alert">{error}</p>}
          <div className="modal-actions">
            <button className="cancel-btn" type="button" onClick={onClose} disabled={isDeleting}>
              Cancel
            </button>
            <button className="delete-confirm-btn" type="button" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting patient...' : 'Delete Patient'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function App() {
  const [token, setToken] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const googleToken = params.get('token')
    if (googleToken) {
      localStorage.setItem('careflow_token', googleToken)
      window.history.replaceState({}, document.title, window.location.pathname)
      return googleToken
    }
    return localStorage.getItem('careflow_token')
  })
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [treatmentView, setTreatmentView] = useState({ patientId: null, status: 'idle', data: [], error: '' })
  const [treatmentDetails, setTreatmentDetails] = useState({ id: null, status: 'idle', data: null, error: '' })
  const [treatmentDetailsMessage, setTreatmentDetailsMessage] = useState('')
  const [isTreatmentDetailsOpen, setIsTreatmentDetailsOpen] = useState(false)
  const [isTreatmentEditOpen, setIsTreatmentEditOpen] = useState(false)
  const [documentsView, setDocumentsView] = useState({ patientId: null, status: 'idle', data: [], error: '' })
  const [documentUploadMessage, setDocumentUploadMessage] = useState({ patientId: null, type: '', text: '' })
  const [documentActionMessage, setDocumentActionMessage] = useState({ patientId: null, type: '', text: '' })
  const [documentPreview, setDocumentPreview] = useState(null)
  const [documentDeleteTarget, setDocumentDeleteTarget] = useState(null)
  const [isUploadingDocument, setIsUploadingDocument] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchText, setSearchText] = useState('')
  const [activeSection, setActiveSection] = useState('dashboard')
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false)
  const [isPatientCreationOpen, setIsPatientCreationOpen] = useState(false)
  const [isPatientEditOpen, setIsPatientEditOpen] = useState(false)
  const [isPatientDeleteOpen, setIsPatientDeleteOpen] = useState(false)
  const treatmentRequestId = useRef(0)
  const treatmentDetailsRequestId = useRef(0)
  const documentsRequestId = useRef(0)
  const uploadInProgress = useRef(false)
  const documentPreviewRequestId = useRef(0)
  const documentPreviewAbortController = useRef(null)
  const documentActionRequestId = useRef(0)

  useEffect(() => {
    const objectUrl = documentPreview?.url
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [documentPreview?.url])

  useEffect(() => {
    if (!token) return

    const updateActiveSection = () => {
      const activationLine = window.innerHeight * 0.4
      const treatmentSection = document.getElementById('treatment-history-section')
      const patientSection = document.getElementById('patients-section')

      if (treatmentSection && treatmentSection.getBoundingClientRect().top <= activationLine) {
        setActiveSection('treatments')
      } else if (patientSection && patientSection.getBoundingClientRect().top <= activationLine) {
        setActiveSection('patients')
      } else {
        setActiveSection('dashboard')
      }
    }

    window.addEventListener('scroll', updateActiveSection, { passive: true })
    return () => window.removeEventListener('scroll', updateActiveSection)
  }, [token])

  const handleLogin = (data) => {
    localStorage.setItem('careflow_token', data.token)
    setToken(data.token)
  }

  const logout = useCallback(() => {
    localStorage.removeItem('careflow_token')
    setToken(null)
  }, [])

  const request = useCallback(async (url, options = {}) => {
    return fetch(apiUrl(url), {
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

  const loadTreatments = useCallback(async (patient) => {
    if (!patient) return
    const response = await request(`/api/patients/${patient.id}/treatments`)
    if (response.status === 401) {
      logout()
      throw new Error('Your session has expired')
    }
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
    const data = await response.json()
    return data.map(mapTreatment)
  }, [logout, request])

  const fetchTreatmentDetails = useCallback(async (treatmentId, fallbackData = null) => {
    const requestId = ++treatmentDetailsRequestId.current
    setTreatmentDetails({ id: treatmentId, status: 'loading', data: fallbackData, error: '' })

    try {
      const response = await request(`/api/treatments/${treatmentId}`)
      if (response.status === 401) {
        logout()
        throw new Error('Your session has expired')
      }

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || `Unable to load treatment details (status ${response.status})`)
      }

      if (requestId === treatmentDetailsRequestId.current) {
        setTreatmentDetails({ id: treatmentId, status: 'success', data, error: '' })
      }
    } catch (loadError) {
      if (requestId === treatmentDetailsRequestId.current) {
        setTreatmentDetails({ id: treatmentId, status: 'error', data: fallbackData, error: loadError.message })
      }
    }
  }, [logout, request])

  const showTreatmentDetails = (treatmentId) => {
    setTreatmentDetailsMessage('')
    setIsTreatmentEditOpen(false)
    setIsTreatmentDetailsOpen(true)
    fetchTreatmentDetails(treatmentId)
  }

  const closeTreatmentDetails = useCallback(() => {
    treatmentDetailsRequestId.current += 1
    setIsTreatmentDetailsOpen(false)
  }, [])

  const loadDocuments = useCallback(async (patient) => {
    const response = await request(`/api/patients/${patient.id}/documents`)
    const data = await parseApiJson(response, 'Unable to load patient documents')
    if (!Array.isArray(data)) throw new Error('Unable to load patient documents: the API returned an invalid list.')
    return data
  }, [request])

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
  }, [logout, request, token])

  useEffect(() => {
    if (!selectedPatient) return
    const patient = selectedPatient
    const requestId = ++treatmentRequestId.current
    request(`/api/patients/${patient.id}/treatments`)
      .then((response) => {
        if (response.status === 401) {
          logout()
          throw new Error('Your session has expired')
        }
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
        return response.json()
      })
      .then((data) => {
        if (requestId === treatmentRequestId.current) {
          setTreatmentView({ patientId: patient.id, status: 'success', data: data.map(mapTreatment), error: '' })
        }
      })
      .catch((loadError) => {
        if (requestId === treatmentRequestId.current) {
          setTreatmentView({ patientId: patient.id, status: 'error', data: [], error: loadError.message })
        }
      })
    return () => {
      if (requestId === treatmentRequestId.current) treatmentRequestId.current += 1
    }
  }, [logout, request, selectedPatient])

  useEffect(() => {
    if (!selectedPatient) return
    const patient = selectedPatient
    const requestId = ++documentsRequestId.current
    loadDocuments(patient)
      .then((data) => {
        if (requestId === documentsRequestId.current) {
          setDocumentsView({ patientId: patient.id, status: 'success', data, error: '' })
        }
      })
      .catch((loadError) => {
        if (requestId === documentsRequestId.current) {
          setDocumentsView({ patientId: patient.id, status: 'error', data: [], error: loadError.message })
        }
      })
    return () => {
      if (requestId === documentsRequestId.current) documentsRequestId.current += 1
    }
  }, [loadDocuments, selectedPatient])

  const retryTreatmentHistory = () => {
    if (!selectedPatient) return
    const patient = selectedPatient
    const requestId = ++treatmentRequestId.current
    setTreatmentView({ patientId: patient.id, status: 'loading', data: [], error: '' })
    loadTreatments(patient)
      .then((data) => {
        if (requestId === treatmentRequestId.current) {
          setTreatmentView({ patientId: patient.id, status: 'success', data, error: '' })
        }
      })
      .catch((loadError) => {
        if (requestId === treatmentRequestId.current) {
          setTreatmentView({ patientId: patient.id, status: 'error', data: [], error: loadError.message })
        }
      })
  }

  const retryDocuments = () => {
    if (!selectedPatient) return
    const patient = selectedPatient
    const requestId = ++documentsRequestId.current
    setDocumentsView({ patientId: patient.id, status: 'loading', data: [], error: '' })
    loadDocuments(patient)
      .then((data) => {
        if (requestId === documentsRequestId.current) {
          setDocumentsView({ patientId: patient.id, status: 'success', data, error: '' })
        }
      })
      .catch((loadError) => {
        if (requestId === documentsRequestId.current) {
          setDocumentsView({ patientId: patient.id, status: 'error', data: [], error: loadError.message })
        }
      })
  }

  const closeDocumentPreview = useCallback(() => {
    documentPreviewRequestId.current += 1
    documentPreviewAbortController.current?.abort()
    documentPreviewAbortController.current = null
    setDocumentPreview(null)
  }, [])

  const resetDocumentActions = () => {
    closeDocumentPreview()
    documentsRequestId.current += 1
    documentActionRequestId.current += 1
    setDocumentDeleteTarget(null)
    setDocumentActionMessage({ patientId: null, type: '', text: '' })
  }

  const refreshDocumentsForPatient = async (patient) => {
    const requestId = ++documentsRequestId.current
    setDocumentsView({ patientId: patient.id, status: 'loading', data: [], error: '' })
    try {
      const data = await loadDocuments(patient)
      if (requestId === documentsRequestId.current) {
        setDocumentsView({ patientId: patient.id, status: 'success', data, error: '' })
        return true
      }
    } catch (loadError) {
      if (requestId === documentsRequestId.current) {
        setDocumentsView({ patientId: patient.id, status: 'error', data: [], error: loadError.message })
      }
    }
    return false
  }

  const previewDocument = async (patient, document) => {
    if (!selectedPatient || patient.id !== selectedPatient.id || !getDocumentType(document.mimeType).previewable) return

    documentPreviewAbortController.current?.abort()
    const requestId = ++documentPreviewRequestId.current
    const controller = new AbortController()
    documentPreviewAbortController.current = controller
    setDocumentPreview({
      patientId: patient.id,
      documentId: document._id,
      originalName: document.originalName,
      mimeType: document.mimeType,
      status: 'loading',
      url: null,
      error: '',
    })

    try {
      const response = await request(
        `/api/patients/${patient.id}/documents/${document._id}/preview`,
        { signal: controller.signal },
      )
      if (response.status === 401) {
        logout()
        throw new Error('Your session has expired')
      }
      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Unable to preview document'))
      }

      const contentType = getContentType(response)
      if (contentType !== document.mimeType) {
        const detail = contentType === 'text/html'
          ? 'The server returned an HTML page instead of the document. Check the API URL and backend route.'
          : `Expected ${document.mimeType}, but received ${contentType || 'an unknown content type'}.`
        throw new Error(`Unable to preview document (HTTP ${response.status}). ${detail}`)
      }

      const blob = await response.blob()
      if (requestId !== documentPreviewRequestId.current) return
      const url = URL.createObjectURL(blob)
      setDocumentPreview({
        patientId: patient.id,
        documentId: document._id,
        originalName: document.originalName,
        mimeType: document.mimeType,
        status: 'success',
        url,
        error: '',
      })
    } catch (previewError) {
      if (requestId === documentPreviewRequestId.current && previewError.name !== 'AbortError') {
        setDocumentPreview({
          patientId: patient.id,
          documentId: document._id,
          originalName: document.originalName,
          mimeType: document.mimeType,
          status: 'error',
          url: null,
          error: previewError.message,
        })
      }
    } finally {
      if (requestId === documentPreviewRequestId.current) {
        documentPreviewAbortController.current = null
      }
    }
  }

  const requestDocumentDeletion = (patient, document) => {
    if (!selectedPatient || patient.id !== selectedPatient.id) return
    setDocumentActionMessage({ patientId: patient.id, type: '', text: '' })
    setDocumentDeleteTarget({ patient, document })
  }

  const deleteDocument = async (patient, document) => {
    if (!selectedPatient || patient.id !== selectedPatient.id) {
      throw new Error('The selected patient changed. Please select the patient and try again.')
    }
    const actionRequestId = ++documentActionRequestId.current
    const response = await request(`/api/patients/${patient.id}/documents/${document._id}`, {
      method: 'DELETE',
    })
    if (response.status === 401) {
      logout()
      throw new Error('Your session has expired')
    }
    await parseApiJson(response, 'Unable to delete document')

    if (actionRequestId !== documentActionRequestId.current) return
    setDocumentActionMessage({
      patientId: patient.id,
      type: 'success',
      text: `${document.originalName} was deleted.`,
    })
    const refreshed = await refreshDocumentsForPatient(patient)
    if (!refreshed && actionRequestId === documentActionRequestId.current) {
      setDocumentActionMessage({
        patientId: patient.id,
        type: 'error',
        text: 'Document was deleted, but the document list could not be refreshed. Please retry.',
      })
    }
  }

  const createPatient = async (patientData) => {
    const response = await request('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData),
    })
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Unable to create patient')
    }

    setIsPatientCreationOpen(false)
    setError('')
    setSuccess('Patient created successfully.')
    try {
      await loadPatients()
    } catch (refreshError) {
      setError(`Patient was created, but the list could not be refreshed: ${refreshError.message}`)
    }
  }

  const updatePatient = async (patientData) => {
    if (!selectedPatient) throw new Error('Select a patient before editing.')

    const editableFields = Object.fromEntries(
      Object.entries(patientData).filter(([field]) => field !== 'patientId'),
    )
    const response = await request(`/api/patients/${selectedPatient.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editableFields),
    })
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Unable to update patient')
    }

    setIsPatientEditOpen(false)
    setError('')
    setSuccess('Patient updated successfully.')
    try {
      await loadPatients()
    } catch (refreshError) {
      setError(`Patient was updated, but the list could not be refreshed: ${refreshError.message}`)
    }
  }

  const deletePatient = async () => {
    if (!selectedPatient) throw new Error('Select a patient before deleting.')

    const response = await request(`/api/patients/${selectedPatient.id}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Unable to delete patient')
    }

    setError('')
    setSuccess(`${selectedPatient.name} was removed from the active patient list.`)
    try {
      await loadPatients()
    } catch (refreshError) {
      setError(`Patient was deleted, but the list could not be refreshed: ${refreshError.message}`)
    }
  }

  const suggestNotes = async (draftText) => {
    const response = await request('/api/treatments/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftText }),
    })
    if (response.status === 401) {
      logout()
      throw new Error('Your session has expired')
    }

    const data = await parseApiJson(response, 'Unable to generate a notes suggestion')
    if (!data || typeof data.suggestion !== 'string' || !data.suggestion.trim()) {
      throw new Error('The server returned an invalid suggestion.')
    }
    return data.suggestion
  }

  const createTreatment = async (treatmentData) => {
    if (!selectedPatient) throw new Error('Select a patient before adding a treatment.')

    const response = await request(`/api/patients/${selectedPatient.id}/treatments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(treatmentData),
    })
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Unable to add treatment record')
    }

    setSuccess('Treatment record added successfully.')
    setError('')
    setIsTreatmentModalOpen(false)
    const requestId = ++treatmentRequestId.current
    setTreatmentView({ patientId: selectedPatient.id, status: 'loading', data: [], error: '' })
    try {
      const refreshedTreatments = await loadTreatments(selectedPatient)
      if (requestId === treatmentRequestId.current) {
        setTreatmentView({ patientId: selectedPatient.id, status: 'success', data: refreshedTreatments, error: '' })
      }
    } catch (refreshError) {
      if (requestId === treatmentRequestId.current) {
        setTreatmentView({ patientId: selectedPatient.id, status: 'error', data: [], error: refreshError.message })
      }
      setError(`Treatment was created, but ${refreshError.message.toLowerCase()}`)
    }
  }

  const updateTreatment = async (treatmentId, treatmentData) => {
    if (!selectedPatient) throw new Error('Select a patient before editing a treatment.')
    const patient = selectedPatient

    const response = await request(`/api/treatments/${treatmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(treatmentData),
    })
    if (response.status === 401) {
      logout()
      throw new Error('Your session has expired')
    }

    const updatedTreatment = await response.json()
    if (!response.ok) {
      throw new Error(updatedTreatment.message || 'Unable to update treatment record')
    }

    setTreatmentDetailsMessage('Treatment record updated successfully.')
    const historyRequestId = ++treatmentRequestId.current
    setTreatmentView({ patientId: patient.id, status: 'loading', data: [], error: '' })

    const refreshHistory = (async () => {
      try {
        const refreshedTreatments = await loadTreatments(patient)
        if (historyRequestId === treatmentRequestId.current) {
          setTreatmentView({ patientId: patient.id, status: 'success', data: refreshedTreatments, error: '' })
        }
      } catch (refreshError) {
        if (historyRequestId === treatmentRequestId.current) {
          setTreatmentView({ patientId: patient.id, status: 'error', data: [], error: refreshError.message })
        }
      }
    })()

    await Promise.all([
      refreshHistory,
      fetchTreatmentDetails(treatmentId, updatedTreatment),
    ])
  }

  const uploadDocument = async (file) => {
    if (!file || !selectedPatient || uploadInProgress.current) return
    const patient = selectedPatient
    const currentRequestId = documentsRequestId.current
    const formData = new FormData()
    formData.append('document', file)

    uploadInProgress.current = true
    setIsUploadingDocument(true)
    setDocumentUploadMessage({ patientId: patient.id, type: '', text: '' })
    try {
      const response = await request(`/api/patients/${patient.id}/documents`, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Unable to upload document')
      }
      setDocumentUploadMessage({ patientId: patient.id, type: 'success', text: 'Document uploaded successfully.' })

      if (selectedPatient?.id === patient.id && documentsRequestId.current === currentRequestId) {
        const refreshRequestId = ++documentsRequestId.current
        setDocumentsView({ patientId: patient.id, status: 'loading', data: [], error: '' })
        loadDocuments(patient)
          .then((data) => {
            if (refreshRequestId === documentsRequestId.current) {
              setDocumentsView({ patientId: patient.id, status: 'success', data, error: '' })
            }
          })
          .catch((loadError) => {
            if (refreshRequestId === documentsRequestId.current) {
              setDocumentsView({ patientId: patient.id, status: 'error', data: [], error: loadError.message })
            }
          })
      }
    } catch (uploadError) {
      setDocumentUploadMessage({ patientId: patient.id, type: 'error', text: uploadError.message })
    } finally {
      uploadInProgress.current = false
      setIsUploadingDocument(false)
    }
  }

  const navigateToSection = (section) => {
    setActiveSection(section)
    if (section === 'dashboard') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const targetId = section === 'patients' ? 'patients-section' : 'treatment-history-section'
    document.getElementById(targetId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  if (!token) return <LoginScreen onLogin={handleLogin} />

  const treatmentViewForSelected = selectedPatient && treatmentView.patientId === selectedPatient.id
    ? treatmentView
    : { status: selectedPatient ? 'loading' : 'idle', data: [], error: '' }
  const documentsViewForSelected = selectedPatient && documentsView.patientId === selectedPatient.id
    ? documentsView
    : { status: selectedPatient ? 'loading' : 'idle', data: [], error: '' }
  const uploadMessageForSelected = selectedPatient && documentUploadMessage.patientId === selectedPatient.id
    ? documentUploadMessage
    : null
  const treatments = treatmentViewForSelected.data
  const documents = documentsViewForSelected.data

  const searchTerm = searchText.trim().toLowerCase()
  const filteredPatients = searchTerm
    ? patients.filter((patient) => {
      const searchableFields = [
        patient.name,
        patient.patientId,
        patient.id,
        patient.firstName,
        patient.lastName,
        patient.phone,
        patient.email,
        patient.address,
        patient.bloodGroup,
        ...(patient.allergies || []),
      ]
      return searchableFields.some((value) => String(value || '').toLowerCase().includes(searchTerm))
    })
    : patients

  const followUpHistoryAvailable = treatmentViewForSelected.status === 'success'
  const followUpCount = followUpHistoryAvailable
    ? treatments.filter((treatment) => treatment.status === 'Follow-up').length
    : 'Not available'
  const followUpDescription = !selectedPatient
    ? 'Select a patient'
    : treatmentViewForSelected.status === 'loading'
      ? 'Loading treatment history'
      : treatmentViewForSelected.status === 'error'
        ? 'Treatment history unavailable'
        : 'Selected patient'
  const stats = [
    { label: 'Total patients', value: patients.length, change: 'Database total' },
    { label: 'Follow-up records', value: followUpCount, change: followUpDescription },
  ]

  return (
    <div className="clinic-app">
      <SidebarNav activeSection={activeSection} onNavigate={navigateToSection} />

      <main className="main-panel">
        <HeaderBar
          onCreatePatient={() => {
            setError('')
            setSuccess('')
            setIsPatientCreationOpen(true)
          }}
          onLogout={logout}
          searchText={searchText}
          onSearchChange={setSearchText}
        />

        {error && <p className="error-state">{error}</p>}
        {success && <p className="success-state">{success}</p>}

        <section className="stats-grid">
          {stats.map((stat) => (
            <StatsCard key={stat.label} label={stat.label} value={stat.value} change={stat.change} />
          ))}
        </section>

        <section className="content-grid" id="patients-section">
          {selectedPatient || searchText.trim() ? (
            <PatientTable
              patients={filteredPatients}
              selectedPatient={selectedPatient}
              onSelect={(patient) => {
                if (selectedPatient?.id === patient.id) return
                resetDocumentActions()
                setTreatmentView({ patientId: patient.id, status: 'loading', data: [], error: '' })
                setDocumentsView({ patientId: patient.id, status: 'loading', data: [], error: '' })
                setSelectedPatient(patient)
              }}
              searchText={searchText}
            />
          ) : (
            <section className="panel"><p className="empty-state">Add a patient to begin.</p></section>
          )}
          {selectedPatient && (
            <QuickActionPanel
              patient={selectedPatient}
              documents={documents}
              documentsStatus={documentsViewForSelected.status}
              documentsError={documentsViewForSelected.error}
              onRetryDocuments={retryDocuments}
              documentActionMessage={documentActionMessage.patientId === selectedPatient.id
                ? documentActionMessage
                : null}
              uploadMessage={uploadMessageForSelected}
              isUploadingDocument={isUploadingDocument}
              onUpdate={() => {
                setError('')
                setSuccess('')
                setIsPatientEditOpen(true)
              }}
              onDelete={() => {
                setError('')
                setSuccess('')
                setIsPatientDeleteOpen(true)
              }}
              onUpload={uploadDocument}
              onPreviewDocument={previewDocument}
              onDeleteDocument={requestDocumentDeletion}
              onAddTreatment={() => {
                setSuccess('')
                setError('')
                setIsTreatmentModalOpen(true)
              }}
            />
          )}
        </section>

        {selectedPatient ? (
          <TreatmentHistoryPanel
            patient={selectedPatient}
            treatments={treatments}
            status={treatmentViewForSelected.status}
            error={treatmentViewForSelected.error}
            onRetry={retryTreatmentHistory}
            onSelectTreatment={showTreatmentDetails}
          />
        ) : (
          <section className="panel panel-large no-selected-treatment" id="treatment-history-section">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Treatment history</p>
                <h3>Treatment History</h3>
              </div>
            </div>
            <p className="empty-state">Select a patient to view treatment history.</p>
          </section>
        )}
        {isTreatmentDetailsOpen && !isTreatmentEditOpen && (
          <TreatmentDetailsModal
            treatment={treatmentDetails.data}
            status={treatmentDetails.status}
            error={treatmentDetails.error}
            successMessage={treatmentDetailsMessage}
            onClose={closeTreatmentDetails}
            onRetry={() => {
              if (treatmentDetails.id) fetchTreatmentDetails(treatmentDetails.id, treatmentDetails.data)
            }}
            onEdit={() => setIsTreatmentEditOpen(true)}
          />
        )}
        {isTreatmentDetailsOpen && isTreatmentEditOpen && treatmentDetails.data && selectedPatient && (
          <EditTreatmentModal
            treatment={treatmentDetails.data}
            patient={selectedPatient}
            onClose={() => setIsTreatmentEditOpen(false)}
            onSubmit={(treatmentData) => updateTreatment(treatmentDetails.id, treatmentData)}
            onSuggestNotes={suggestNotes}
          />
        )}
        {selectedPatient && isTreatmentModalOpen && (
          <AddTreatmentModal
            patient={selectedPatient}
            onClose={() => setIsTreatmentModalOpen(false)}
            onSubmit={createTreatment}
            onSuggestNotes={suggestNotes}
          />
        )}
        {isPatientCreationOpen && (
          <PatientFormModal
            patients={patients}
            onClose={() => setIsPatientCreationOpen(false)}
            onSubmit={createPatient}
          />
        )}
        {selectedPatient && isPatientEditOpen && (
          <PatientFormModal
            patient={selectedPatient}
            patients={patients}
            onClose={() => setIsPatientEditOpen(false)}
            onSubmit={updatePatient}
          />
        )}
        {selectedPatient && isPatientDeleteOpen && (
          <DeletePatientModal
            patient={selectedPatient}
            onClose={() => setIsPatientDeleteOpen(false)}
            onConfirm={deletePatient}
          />
        )}
        {selectedPatient && documentPreview?.patientId === selectedPatient.id && (
          <DocumentPreviewModal
            preview={documentPreview}
            onClose={closeDocumentPreview}
            onRetry={() => previewDocument(selectedPatient, {
              _id: documentPreview.documentId,
              originalName: documentPreview.originalName,
              mimeType: documentPreview.mimeType,
            })}
          />
        )}
        {selectedPatient && documentDeleteTarget?.patient.id === selectedPatient.id && (
          <DeleteDocumentModal
            document={documentDeleteTarget.document}
            patient={documentDeleteTarget.patient}
            onClose={() => setDocumentDeleteTarget(null)}
            onConfirm={() => deleteDocument(documentDeleteTarget.patient, documentDeleteTarget.document)}
          />
        )}
      </main>
    </div>
  )
}

export default App

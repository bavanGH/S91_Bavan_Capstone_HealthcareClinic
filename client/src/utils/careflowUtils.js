export const getContentType = (response) => (response.headers.get('content-type') || '')
  .split(';')[0]
  .trim()
  .toLowerCase()

const isJsonContentType = (contentType) => contentType === 'application/json' || contentType.endsWith('+json')

export const getApiErrorMessage = async (response, fallback) => {
  const contentType = getContentType(response)
  if (isJsonContentType(contentType)) {
    try {
      const data = await response.json()
      if (typeof data.message === 'string' && data.message.trim()) return data.message
    } catch {
      return `${fallback} (HTTP ${response.status}). The server declared JSON but returned an invalid response.`
    }
  }

  if (contentType === 'text/html') {
    return `${fallback} (HTTP ${response.status}). The server returned an HTML page instead of an API response. Check the API URL and backend route.`
  }
  return `${fallback} (HTTP ${response.status}). Received ${contentType || 'an unknown content type'} instead of a JSON API response.`
}

export const parseApiJson = async (response, fallback) => {
  if (!response.ok) throw new Error(await getApiErrorMessage(response, fallback))
  const contentType = getContentType(response)
  if (!isJsonContentType(contentType)) {
    const format = contentType === 'text/html' ? 'an HTML page' : contentType || 'an unknown content type'
    throw new Error(`${fallback} (HTTP ${response.status}). Expected JSON but received ${format}; check the API URL and backend route.`)
  }
  try {
    return await response.json()
  } catch {
    throw new Error(`${fallback} (HTTP ${response.status}). The server returned invalid JSON.`)
  }
}

export const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not available')

export const formatFileSize = (size) => {
  if (!Number.isFinite(size) || size < 0) return 'Size unavailable'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export const getDocumentType = (mimeType) => {
  const types = {
    'application/pdf': { label: 'PDF', name: 'PDF document', previewable: true },
    'image/jpeg': { label: 'JPG', name: 'JPEG image', previewable: true },
    'image/png': { label: 'PNG', name: 'PNG image', previewable: true },
    'text/plain': { label: 'TXT', name: 'Text document', previewable: false },
  }
  return types[mimeType] || { label: 'FILE', name: mimeType || 'File', previewable: false }
}

export const mapPatient = (patient) => ({
  ...patient,
  id: patient.patientId,
  name: patient.fullName,
  sex: patient.gender,
  lastVisit: patient.lastVisit || 'Not available',
  risk: patient.risk || 'Not available',
  doctor: patient.doctor || 'Not available',
  condition: patient.condition || 'Not available',
  nextAction: patient.nextAction || 'Not available',
})

export const mapTreatment = (treatment) => ({
  id: treatment._id,
  date: formatDate(treatment.treatmentDate),
  doctor: treatment.doctorName,
  type: treatment.department,
  details: treatment.diagnosis,
  status: treatment.status,
})

import { describe, expect, it } from 'vitest'
import {
  formatFileSize,
  getDocumentType,
  mapPatient,
  mapTreatment,
  parseApiJson,
} from './careflowUtils'

describe('parseApiJson', () => {
  it('parses a successful JSON response', async () => {
    const payload = { documents: [] }
    const response = {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json; charset=utf-8' },
      json: async () => payload,
    }

    await expect(parseApiJson(response, 'Unable to load documents')).resolves.toEqual(payload)
  })

  it('reports an HTML response instead of attempting to parse it as JSON', async () => {
    const response = {
      ok: true,
      status: 200,
      headers: { get: () => 'text/html; charset=utf-8' },
      json: async () => {
        throw new SyntaxError('Unexpected token <')
      },
    }

    await expect(parseApiJson(response, 'Unable to load documents')).rejects.toThrow(
      'Unable to load documents (HTTP 200). Expected JSON but received an HTML page; check the API URL and backend route.',
    )
  })

  it('reports invalid JSON from a response declared as JSON', async () => {
    const response = {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input')
      },
    }

    await expect(parseApiJson(response, 'Unable to load documents')).rejects.toThrow(
      'Unable to load documents (HTTP 200). The server returned invalid JSON.',
    )
  })
})

describe('mapPatient', () => {
  it('maps API identity fields and supplies the existing neutral fallbacks', () => {
    const patient = mapPatient({
      patientId: 'PT-123456',
      fullName: 'Alex Morgan',
      gender: 'Female',
      age: 42,
    })

    expect(patient.id).toBe('PT-123456')
    expect(patient.name).toBe('Alex Morgan')
    expect(patient.sex).toBe('Female')
    expect(patient.lastVisit).toBe('Not available')
    expect(patient.risk).toBe('Not available')
    expect(patient.doctor).toBe('Not available')
    expect(patient.condition).toBe('Not available')
    expect(patient.nextAction).toBe('Not available')
    expect(patient.age).toBe(42)
  })
})

describe('mapTreatment', () => {
  it('preserves the MongoDB ID and maps treatment fields', () => {
    const treatmentDate = '2024-06-15T12:00:00.000Z'
    const mapped = mapTreatment({
      _id: 'mongo-treatment-id',
      treatmentDate,
      doctorName: 'Dr. Morgan',
      department: 'Cardiology',
      diagnosis: 'Hypertension',
      status: 'Follow-up',
    })

    expect(mapped).toEqual({
      id: 'mongo-treatment-id',
      date: new Date(treatmentDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      doctor: 'Dr. Morgan',
      type: 'Cardiology',
      details: 'Hypertension',
      status: 'Follow-up',
    })
  })
})

describe('getDocumentType', () => {
  it.each([
    ['application/pdf', { label: 'PDF', name: 'PDF document', previewable: true }],
    ['image/jpeg', { label: 'JPG', name: 'JPEG image', previewable: true }],
    ['image/png', { label: 'PNG', name: 'PNG image', previewable: true }],
    ['text/plain', { label: 'TXT', name: 'Text document', previewable: false }],
    ['application/zip', { label: 'FILE', name: 'application/zip', previewable: false }],
  ])('returns the configured type for %s', (mimeType, expected) => {
    expect(getDocumentType(mimeType)).toEqual(expected)
  })
})

describe('formatFileSize', () => {
  it.each([
    [0, '0 B'],
    [999, '999 B'],
    [1024, '1.0 KB'],
    [1536, '1.5 KB'],
    [1024 * 1024, '1.0 MB'],
    [-1, 'Size unavailable'],
    [Number.POSITIVE_INFINITY, 'Size unavailable'],
    [Number.NaN, 'Size unavailable'],
  ])('formats %s as %s', (size, expected) => {
    expect(formatFileSize(size)).toBe(expected)
  })
})

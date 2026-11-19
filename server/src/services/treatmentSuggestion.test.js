import assert from 'node:assert/strict'
import test from 'node:test'
import {
  generateNotesSuggestion,
  GEMINI_MODEL,
  isGeminiTimeoutError,
  MAX_NOTES_DRAFT_LENGTH,
  validateNotesSuggestionBody,
} from './treatmentSuggestion.js'

test('accepts and trims a non-empty notes draft', () => {
  assert.deepEqual(validateNotesSuggestionBody({ draftText: '  Follow-up completed.  ' }), {
    draftText: 'Follow-up completed.',
  })
})

test('rejects empty or non-string drafts', () => {
  assert.ok(validateNotesSuggestionBody({ draftText: '  ' }).error)
  assert.ok(validateNotesSuggestionBody({ draftText: 123 }).error)
  assert.ok(validateNotesSuggestionBody(null).error)
})

test('rejects oversized drafts and extra patient data', () => {
  assert.ok(validateNotesSuggestionBody({ draftText: 'x'.repeat(MAX_NOTES_DRAFT_LENGTH + 1) }).error)
  assert.ok(validateNotesSuggestionBody({ draftText: 'Draft', patientId: 'patient-id' }).error)
  assert.ok(validateNotesSuggestionBody({ draftText: 'Draft', diagnosis: 'diagnosis' }).error)
})

test('uses the configured model and returns trimmed generated text', async () => {
  let request
  const ai = {
    models: {
      generateContent: async (params) => {
        request = params
        return { text: '  Follow-up completed and documented.  ' }
      },
    },
  }

  const suggestion = await generateNotesSuggestion('Follow-up complete', ai)

  assert.equal(suggestion, 'Follow-up completed and documented.')
  assert.equal(request.model, GEMINI_MODEL)
  assert.ok(request.config.abortSignal instanceof AbortSignal)
  assert.match(request.config.systemInstruction, /Do not invent or infer clinical facts/)
  assert.match(request.contents, /Follow-up complete/)
})

test('recognizes provider and client-side timeout errors without matching other failures', () => {
  assert.equal(isGeminiTimeoutError({ status: 504 }), true)
  assert.equal(isGeminiTimeoutError(new DOMException('Timed out', 'TimeoutError')), true)
  assert.equal(isGeminiTimeoutError(new DOMException('Aborted', 'AbortError')), true)
  assert.equal(isGeminiTimeoutError({ code: 'ETIMEDOUT' }), true)
  assert.equal(isGeminiTimeoutError({ status: 502 }), false)
  assert.equal(isGeminiTimeoutError({ status: 429 }), false)
  assert.equal(isGeminiTimeoutError(null), false)
})

test('aborts a stalled provider request when the deadline expires', async () => {
  let abortSignal
  const ai = {
    models: {
      generateContent: ({ config }) => {
        abortSignal = config.abortSignal
        return new Promise(() => {})
      },
    },
  }

  await assert.rejects(generateNotesSuggestion('Draft', ai, 5), (error) => {
    assert.equal(isGeminiTimeoutError(error), true)
    return true
  })
  assert.equal(abortSignal.aborted, true)
})

test('rejects an empty provider response', async () => {
  const ai = { models: { generateContent: async () => ({ text: '  ' }) } }
  await assert.rejects(generateNotesSuggestion('Draft', ai), /empty suggestion/)
})

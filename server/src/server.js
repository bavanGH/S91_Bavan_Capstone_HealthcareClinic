import dotenv from 'dotenv'
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import connectDB from './config/db.js'
import requireAuth from './middleware/auth.js'
import { Patient, Treatment, User } from './models/index.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-secret'
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/api/auth/google/callback`
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Healthcare clinic API is running' })
})

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const username = req.body.username?.trim().toLowerCase()
    const password = req.body.password
    if (!username || !password || password.length < 8) {
      return res.status(400).json({ message: 'Username and a password of at least 8 characters are required' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({ username, passwordHash, authProvider: 'local' })
    res.status(201).json({ id: user._id, username: user.username })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const username = req.body.username?.trim().toLowerCase()
    const user = await User.findOne({ username }).select('+passwordHash')
    const validPassword = user && (await bcrypt.compare(req.body.password || '', user.passwordHash))
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid username or password' })
    }

    const token = jwt.sign({ userId: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: '8h' })
    res.json({ token, user: { username: user.username } })
  } catch (error) {
    next(error)
  }
})

app.get('/api/auth/google', (_req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ message: 'Google authentication is not configured' })
  }

  const authorizationUrl = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
  })
  res.redirect(authorizationUrl)
})

app.get('/api/auth/google/callback', async (req, res) => {
  try {
    if (req.query.error) {
      return res.redirect(`${CLIENT_URL}/?auth_error=google_denied`)
    }
    if (!req.query.code) {
      return res.redirect(`${CLIENT_URL}/?auth_error=missing_google_code`)
    }

    const { tokens } = await googleClient.getToken(req.query.code)
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const profile = ticket.getPayload()
    if (!profile?.sub || !profile.email) {
      return res.redirect(`${CLIENT_URL}/?auth_error=invalid_google_profile`)
    }

    const user = await User.findOneAndUpdate(
      { $or: [{ providerId: profile.sub }, { username: profile.email }] },
      {
        $set: {
          email: profile.email,
          displayName: profile.name,
          authProvider: 'google',
          providerId: profile.sub,
        },
        $setOnInsert: { username: profile.email },
      },
      { new: true, upsert: true, runValidators: true },
    )
    const token = jwt.sign({ userId: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: '8h' })
    res.redirect(`${CLIENT_URL}/?token=${encodeURIComponent(token)}`)
  } catch (_error) {
    res.redirect(`${CLIENT_URL}/?auth_error=google_login_failed`)
  }
})

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user.userId, username: req.user.username } })
})

app.use('/api/patients', requireAuth)
app.use('/api/treatments', requireAuth)

app.get('/api/patients', async (_req, res, next) => {
  try {
    const patients = await Patient.find({ isActive: true }).sort({ lastName: 1, firstName: 1 })
    res.json(patients)
  } catch (error) {
    next(error)
  }
})

app.get('/api/patients/:patientId', async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.patientId, isActive: true }).populate('treatments')
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' })
    }

    res.json(patient)
  } catch (error) {
    next(error)
  }
})

app.post('/api/patients', async (req, res, next) => {
  try {
    const patient = await Patient.create(req.body)
    res.status(201).json(patient)
  } catch (error) {
    next(error)
  }
})

app.put('/api/patients/:patientId', async (req, res, next) => {
  try {
    const { patientId: _patientId, ...patientData } = req.body
    const patient = await Patient.findOneAndUpdate(
      { patientId: req.params.patientId, isActive: true },
      patientData,
      { new: true, runValidators: true },
    )
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' })
    }

    res.json(patient)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/patients/:patientId', async (req, res, next) => {
  try {
    const patient = await Patient.findOneAndUpdate(
      { patientId: req.params.patientId, isActive: true },
      { isActive: false },
      { new: true },
    )
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' })
    }

    res.json({ message: 'Patient deleted', patientId: patient.patientId })
  } catch (error) {
    next(error)
  }
})

app.get('/api/patients/:patientId/treatments', async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.patientId })
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' })
    }

    const treatments = await Treatment.find({ patientId: patient._id }).sort({ treatmentDate: -1 })
    res.json(treatments)
  } catch (error) {
    next(error)
  }
})

app.post('/api/patients/:patientId/treatments', async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.patientId })
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' })
    }

    const treatment = await Treatment.create({ ...req.body, patientId: patient._id })
    res.status(201).json(treatment)
  } catch (error) {
    next(error)
  }
})

app.post('/api/treatments', async (req, res, next) => {
  try {
    const { patientId, ...treatmentData } = req.body
    const patient = await Patient.findOne({ patientId, isActive: true })
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' })
    }

    const treatment = await Treatment.create({ ...treatmentData, patientId: patient._id })
    res.status(201).json(treatment)
  } catch (error) {
    next(error)
  }
})

app.get('/api/treatments', async (_req, res, next) => {
  try {
    const treatments = await Treatment.find().populate('patientId', 'patientId firstName lastName').sort({ treatmentDate: -1 })
    res.json(treatments)
  } catch (error) {
    next(error)
  }
})

app.get('/api/treatments/:treatmentId', async (req, res, next) => {
  try {
    const treatment = await Treatment.findById(req.params.treatmentId).populate('patientId', 'patientId firstName lastName')
    if (!treatment) {
      return res.status(404).json({ message: 'Treatment not found' })
    }

    res.json(treatment)
  } catch (error) {
    next(error)
  }
})

app.put('/api/treatments/:treatmentId', async (req, res, next) => {
  try {
    const { patientId: _patientId, ...treatmentData } = req.body
    const treatment = await Treatment.findByIdAndUpdate(
      req.params.treatmentId,
      treatmentData,
      { new: true, runValidators: true },
    )
    if (!treatment) {
      return res.status(404).json({ message: 'Treatment not found' })
    }

    res.json(treatment)
  } catch (error) {
    next(error)
  }
})

app.use((error, _req, res, _next) => {
  const status = error.name === 'ValidationError' || error.code === 11000 ? 400 : 500
  const message = error.code === 11000
    ? error.keyPattern?.username ? 'Username already exists' : 'Patient ID already exists'
    : error.message
  res.status(status).json({ message })
})

const startServer = async () => {
  await connectDB()

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
  })
}

startServer()

export default app

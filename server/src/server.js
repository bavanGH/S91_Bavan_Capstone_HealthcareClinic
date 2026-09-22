import dotenv from 'dotenv'
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import connectDB from './config/db.js'
import requireAuth from './middleware/auth.js'
import { Patient, Treatment, User } from './models/index.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-secret'

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
    const user = await User.create({ username, passwordHash })
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

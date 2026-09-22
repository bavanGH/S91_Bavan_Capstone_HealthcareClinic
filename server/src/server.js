import dotenv from 'dotenv'
import express from 'express'
import connectDB from './config/db.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Healthcare clinic API is running' })
})

const startServer = async () => {
  await connectDB()

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
  })
}

startServer()

export default app

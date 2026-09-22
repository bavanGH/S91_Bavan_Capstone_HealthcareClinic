import mongoose from 'mongoose'

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/healthcare_clinic'

  try {
    const connection = await mongoose.connect(mongoURI)
    console.log(`MongoDB connected: ${connection.connection.host}`)
    return connection
  } catch (error) {
    console.error('MongoDB connection error:', error.message)
    process.exit(1)
  }
}

export default connectDB

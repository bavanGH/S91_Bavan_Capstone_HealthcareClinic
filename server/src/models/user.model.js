import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    providerId: {
      type: String,
      sparse: true,
      unique: true,
    },
  },
  { timestamps: true },
)

export default mongoose.model('User', userSchema)

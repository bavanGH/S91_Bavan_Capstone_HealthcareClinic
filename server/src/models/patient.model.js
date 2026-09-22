import mongoose from 'mongoose'

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      min: 0,
      required: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    bloodGroup: {
      type: String,
      trim: true,
    },
    allergies: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

patientSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`
})

patientSchema.virtual('treatments', {
  ref: 'Treatment',
  localField: '_id',
  foreignField: 'patientId',
  justOne: false,
  options: { sort: { treatmentDate: -1 } },
})

patientSchema.set('toJSON', { virtuals: true })
patientSchema.set('toObject', { virtuals: true })

export default mongoose.model('Patient', patientSchema)

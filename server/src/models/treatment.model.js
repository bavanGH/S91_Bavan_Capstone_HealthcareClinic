import mongoose from 'mongoose'

const treatmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    treatmentDate: {
      type: Date,
      required: true,
    },
    diagnosis: {
      type: String,
      required: true,
      trim: true,
    },
    treatmentPlan: {
      type: String,
      required: true,
      trim: true,
    },
    medications: [
      {
        name: String,
        dosage: String,
        frequency: String,
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Completed', 'Pending', 'Follow-up'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  },
)

treatmentSchema.index({ patientId: 1, treatmentDate: -1 })

export default mongoose.model('Treatment', treatmentSchema)

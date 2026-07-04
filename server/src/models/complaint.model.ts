import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export type ComplaintStatus = 'PENDING' | 'ONGOING' | 'COMPLETED';

const complaintSchema = new Schema(
  {
    farmerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    farmerName: { type: String, required: true, trim: true },
    farmerPhone: { type: String, trim: true },
    farmerLocation: { type: String, required: true, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    ward: { type: String, trim: true },
    wardName: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    talukName: { type: String, trim: true },
    talukAdminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    complaintType: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    source: { type: String, enum: ['dashboard', 'whatsapp'], default: 'dashboard', trim: true },
    phoneNumber: { type: String, trim: true },
    message: { type: String, trim: true },
    attachmentUrl: { type: String, trim: true },
    status: {
      type: String,
      enum: ['PENDING', 'ONGOING', 'COMPLETED'],
      default: 'PENDING',
      required: true,
    },
    wardId: { type: String, trim: true, default: '' },
    talukId: { type: String, trim: true, default: '' },
    resolvedAt: { type: Date, default: null },
    escalated: { type: Boolean, default: false, index: true },
    escalatedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

complaintSchema.index({ createdAt: 1, status: 1, escalated: 1 });

export type ComplaintDocument = InferSchemaType<typeof complaintSchema> & { _id: mongoose.Types.ObjectId };

export const ComplaintModel = mongoose.model('Complaint', complaintSchema);

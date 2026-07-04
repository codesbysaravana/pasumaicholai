import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export type GrievanceStatus = 'submitted' | 'in_review' | 'resolved';

const grievanceSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['submitted', 'in_review', 'resolved'],
      default: 'submitted',
      required: true,
    },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type GrievanceDocument = InferSchemaType<typeof grievanceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const GrievanceModel = mongoose.model('Grievance', grievanceSchema);

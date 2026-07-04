import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const schemeSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    eligibility: { type: String, required: true, trim: true },
    upvotes: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type SchemeDocument = InferSchemaType<typeof schemeSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SchemeModel = mongoose.model('Scheme', schemeSchema);

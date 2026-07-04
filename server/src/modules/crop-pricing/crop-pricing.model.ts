import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const cropProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    category: { type: String, enum: ['vegetable', 'fruit'], required: true },
    base_price: { type: Number, required: true, min: 0 },
    demand_score: { type: Number, required: true, min: 0, max: 1, default: 0.5 },
    recommended_price: { type: Number, required: true, min: 0 },
    last_updated: { type: Date, required: true, default: Date.now },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

cropProductSchema.index({ category: 1, name: 1 });

export type CropProductDocument = InferSchemaType<typeof cropProductSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CropProductModel = mongoose.model('CropProduct', cropProductSchema);

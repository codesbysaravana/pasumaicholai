import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const wardSchema = new Schema(
  {
    wardId: { type: String, required: true, trim: true, unique: true },
    wardNumber: { type: Number, required: true, min: 1 },
    wardName: { type: String, required: true, trim: true },
    talukName: { type: String, required: true, trim: true },
    districtName: { type: String, required: true, trim: true },
    aliases: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

wardSchema.index({ wardNumber: 1, talukName: 1 }, { unique: true });
wardSchema.index({ wardName: 1 });
wardSchema.index({ talukName: 1 });
wardSchema.index({ districtName: 1 });

export type WardDocument = InferSchemaType<typeof wardSchema> & { _id: mongoose.Types.ObjectId };

export const WardModel = mongoose.model('Ward', wardSchema);

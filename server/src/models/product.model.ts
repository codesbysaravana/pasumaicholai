import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    cropType: { type: String, required: true, trim: true },
    pricePerKg: { type: Number, required: true, min: 0 },
    quantityKg: { type: Number, required: true, min: 0 },
    location: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type ProductDocument = InferSchemaType<typeof productSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProductModel = mongoose.model('Product', productSchema);

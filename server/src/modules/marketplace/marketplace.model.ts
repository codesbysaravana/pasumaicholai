import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const marketplaceListingSchema = new Schema(
  {
    farmerId: {
      type: String,
      required: true,
      index: true,
    },
    farmer: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      location: { type: String, trim: true },
      village: { type: String, trim: true },
      state: { type: String, trim: true },
      rating: { type: Number, min: 0, max: 5 },
    },
    cropName: {
      type: String,
      required: true,
      trim: true,
    },
    productName: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ['fruit', 'vegetable', 'grain', 'other'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    quantityAvailable: {
      type: Number,
      min: 0,
    },
    pricePerKg: {
      type: Number,
      required: true,
      min: 0,
    },
    harvestDate: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    unit: {
      type: String,
      enum: ['kg', 'ton', 'crate'],
      default: 'kg',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'sold', 'draft'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type MarketplaceListingDocument = InferSchemaType<typeof marketplaceListingSchema> & { _id: mongoose.Types.ObjectId };

export const MarketplaceListingModel = mongoose.model('MarketplaceListing', marketplaceListingSchema);

import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export type UserRole = 'farmer' | 'admin' | 'taluk_admin' | 'expert' | 'consumer' | 'delivery';

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: { // Keeping fullName for compatibility, adding displayName for Aadhaar name
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    dob: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    aadhaarFull: {
      type: String,
      required: true,
      unique: true,
    },
    aadhaarLast4: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['farmer', 'admin', 'taluk_admin', 'expert', 'consumer', 'delivery'],
      default: 'consumer',
      required: true,
    },
    house: String,
    street: String,
    city: String,
    district: String,
    talukName: String,
    wardId: String,
    wardName: String,
    assignedWardId: String,
    assignedWardName: String,
    state: String,
    pincode: String,
    photo: String, // Store photo URL or base64 from Aadhaar mock
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ email: 1 });
userSchema.index({ mobile: 1 });
userSchema.index({ aadhaarFull: 1 });

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };

export const UserModel = (mongoose.models.User as mongoose.Model<UserDocument>) || mongoose.model('User', userSchema);

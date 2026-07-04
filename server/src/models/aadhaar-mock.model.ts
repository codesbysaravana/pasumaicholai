import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const aadhaarMockSchema = new Schema(
    {
        aadhaar: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
        },
        dob: {
            type: String,
            required: true,
        },
        gender: {
            type: String,
            required: true,
        },
        photo: String,
        house: String,
        street: String,
        city: String,
        district: String,
        state: String,
        pincode: String,
        mobile: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

export type AadhaarMockDocument = InferSchemaType<typeof aadhaarMockSchema> & { _id: mongoose.Types.ObjectId };

export const AadhaarMockModel = mongoose.model('AadhaarMock', aadhaarMockSchema, 'aadhaar_mock');

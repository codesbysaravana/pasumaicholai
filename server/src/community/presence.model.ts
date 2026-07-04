import mongoose, { Schema } from 'mongoose';

const userPresenceSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        status: {
            type: String,
            enum: ['online', 'offline'],
            default: 'offline'
        },
        lastSeen: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export const UserPresenceModel = mongoose.model('UserPresence_v2', userPresenceSchema);

import mongoose, { Schema } from 'mongoose';

const communityRepostSchema = new Schema(
    {
        id: { type: String, unique: true, required: true },
        postId: { type: String, required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        versionKey: false,
    }
);

communityRepostSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const CommunityRepostModel = mongoose.model('CommunityRepost_v2', communityRepostSchema);

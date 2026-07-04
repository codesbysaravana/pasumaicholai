import mongoose, { Schema } from 'mongoose';

const communityLikeSchema = new Schema(
    {
        id: { type: String, unique: true, required: true },
        postId: { type: String, required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        reactionType: {
            type: String,
            enum: ['like', 'love', 'insightful', 'wow', 'sad'],
            default: 'like'
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        versionKey: false,
    }
);

communityLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const CommunityLikeModel = mongoose.model('CommunityLike_v2', communityLikeSchema);

import mongoose, { Schema } from 'mongoose';

const communityReactionSchema = new Schema(
    {
        id: { type: String, unique: true, required: true },
        postId: { type: String, required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        reactionType: {
            type: String,
            enum: ['LIKE', 'LOVE', 'SUPPORT', 'INSIGHTFUL', 'CELEBRATE'],
            default: 'LIKE'
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

communityReactionSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const CommunityReactionModel = mongoose.model('CommunityReaction_v2', communityReactionSchema);

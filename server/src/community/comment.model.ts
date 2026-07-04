import mongoose, { Schema } from 'mongoose';

const communityCommentSchema = new Schema(
    {
        id: { type: String, unique: true, required: true },
        postId: { type: String, required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        parentCommentId: { type: String, default: null, index: true },
        commentText: { type: String, required: true },
        likeCount: { type: Number, default: 0 },
        reactions: {
            LIKE: { type: Number, default: 0 },
            LOVE: { type: Number, default: 0 },
            SUPPORT: { type: Number, default: 0 },
            INSIGHTFUL: { type: Number, default: 0 },
            CELEBRATE: { type: Number, default: 0 },
        }
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        versionKey: false,
    }
);

export const CommunityCommentModel = mongoose.model('CommunityComment_v2', communityCommentSchema);

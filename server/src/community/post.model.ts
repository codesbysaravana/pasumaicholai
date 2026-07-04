import mongoose, { Schema } from 'mongoose';

const communityPostSchema = new Schema(
    {
        id: { type: String, unique: true, required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        description: { type: String, required: true },
        visibility: {
            type: String,
            enum: ['PUBLIC', 'FOLLOWERS', 'PRIVATE'],
            default: 'PUBLIC'
        },
        likeCount: { type: Number, default: 0 },
        commentCount: { type: Number, default: 0 },
        repostCount: { type: Number, default: 0 },
        shareCount: { type: Number, default: 0 },
        location: {
            name: String,
            coordinates: [Number],
        },
        reactions: {
            LIKE: { type: Number, default: 0 },
            LOVE: { type: Number, default: 0 },
            SUPPORT: { type: Number, default: 0 },
            INSIGHTFUL: { type: Number, default: 0 },
            CELEBRATE: { type: Number, default: 0 },
        }
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export const CommunityPostModel = mongoose.model('CommunityPost_v2', communityPostSchema);

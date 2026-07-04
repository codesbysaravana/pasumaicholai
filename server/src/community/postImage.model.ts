import mongoose, { Schema } from 'mongoose';

const postImageSchema = new Schema(
    {
        id: { type: String, unique: true, required: true },
        postId: { type: String, ref: 'CommunityPost_v2', required: true, index: true },
        imageUrl: { type: String, required: true },
        displayOrder: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export const PostImageModel = mongoose.model('CommunityPostImage_v2', postImageSchema);

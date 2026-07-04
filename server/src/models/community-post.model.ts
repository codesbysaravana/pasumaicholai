import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const communityPostSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorName: { type: String, required: true, trim: true },
    upvotes: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type CommunityPostDocument = InferSchemaType<typeof communityPostSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CommunityPostModel = mongoose.model('CommunityPost', communityPostSchema);

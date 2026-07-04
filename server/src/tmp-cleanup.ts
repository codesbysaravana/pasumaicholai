import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Define models with explicit collection names to match existing data
const CommunityPostModel = mongoose.model('CommunityPost_v2', new mongoose.Schema({}, { strict: false }), 'communityposts_v2');
const PostImageModel = mongoose.model('CommunityPostImage_v2', new mongoose.Schema({}, { strict: false }), 'communitypostimages_v2');
const CommunityCommentModel = mongoose.model('CommunityComment_v2', new mongoose.Schema({}, { strict: false }), 'communitycomments_v2');
const CommunityReactionModel = mongoose.model('CommunityReaction_v2', new mongoose.Schema({}, { strict: false }), 'communityreactions_v2');
const CommunityRepostModel = mongoose.model('CommunityRepost_v2', new mongoose.Schema({}, { strict: false }), 'communityreposts_v2');
const UserModel = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
const AadhaarMockModel = mongoose.model('AadhaarMock', new mongoose.Schema({}, { strict: false }), 'aadhaar_mock');

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not found');
        process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri, { dbName: process.env.MONGODB_DB_NAME || 'pasumai_cholai' });
    console.log('Connected.');

    console.log('Cleaning up community data...');
    await CommunityPostModel.deleteMany({});
    await PostImageModel.deleteMany({});
    await CommunityCommentModel.deleteMany({});
    await CommunityReactionModel.deleteMany({});
    await CommunityRepostModel.deleteMany({});
    console.log('Community data cleaned.');

    const aadhaar = '111111111111';
    console.log(`Upserting Aadhaar mock for ${aadhaar}...`);
    await AadhaarMockModel.findOneAndUpdate(
        { aadhaar },
        {
            aadhaar,
            name: 'Mock User',
            dob: '1990-01-01',
            gender: 'Male',
            photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mock',
            house: '1',
            street: 'Test Street',
            city: 'Test City',
            district: 'Test District',
            state: 'Tamil Nadu',
            pincode: '600001',
            mobile: '1111111111'
        },
        { upsert: true, returnDocument: 'after' }
    );

    console.log('Upserting User...');
    const passwordHash = await bcrypt.hash('111111', 12);
    await UserModel.findOneAndUpdate(
        { aadhaarFull: aadhaar },
        {
            fullName: 'Mock User',
            email: 'mock@example.com',
            mobile: '1111111111',
            dob: '1990-01-01',
            gender: 'Male',
            passwordHash,
            aadhaarFull: aadhaar,
            aadhaarLast4: '1111',
            role: 'farmer'
        },
        { upsert: true, returnDocument: 'after' }
    );
    console.log('User upserted.');

    await mongoose.disconnect();
    console.log('Success.');
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});

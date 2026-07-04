import mongoose from 'mongoose';
import { AadhaarMockModel } from './aadhaar-mock.model';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedAadhaar = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        const dbName = process.env.MONGODB_DB_NAME || 'pasumai_cholai';

        if (!mongoUri) {
            throw new Error('MONGODB_URI not found in environment');
        }

        console.log(`Connecting to database: ${dbName}...`);
        await mongoose.connect(mongoUri, { dbName });
        console.log('✅ Connected to MongoDB');

        const mockData = [
            {
                aadhaar: '123456789012',
                name: 'Arun Kumar',
                dob: '1990-05-20',
                gender: 'Male',
                photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arun',
                house: '10/B, Green Garden',
                street: 'Marudhamalai Road',
                city: 'Coimbatore',
                district: 'Coimbatore',
                state: 'Tamil Nadu',
                pincode: '641046',
                mobile: '9876543210',
            },
            {
                aadhaar: '987654321098',
                name: 'Priya Dharshini',
                dob: '1995-11-12',
                gender: 'Female',
                photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
                house: '42',
                street: 'Anna Salai',
                city: 'Chennai',
                district: 'Chennai',
                state: 'Tamil Nadu',
                pincode: '600002',
                mobile: '8765432109',
            },
            {
                aadhaar: '111122223333',
                name: 'Senthil Nathan',
                dob: '1982-08-30',
                gender: 'Male',
                photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Senthil',
                house: '5/122',
                street: 'V.O.C Street',
                city: 'Madurai',
                district: 'Madurai',
                state: 'Tamil Nadu',
                pincode: '625001',
                mobile: '9988776655',
            },
            {
                aadhaar: '444455556666',
                name: 'Muthu Lakshmi',
                dob: '1988-03-15',
                gender: 'Female',
                photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Muthu',
                house: '77',
                street: 'Temple Road',
                city: 'Trichy',
                district: 'Trichy',
                state: 'Tamil Nadu',
                pincode: '620002',
                mobile: '8877665544',
            },
            {
                aadhaar: '111100004321',
                name: 'Siva',
                dob: '2002-06-15',
                gender: 'Female',
                photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Siva',
                house: '12/4',
                street: 'Anna Nagar Main Road',
                city: 'Chennai',
                district: 'Chennai',
                state: 'Tamil Nadu',
                pincode: '600040',
                mobile: '9884690990',
            }
        ];

        await AadhaarMockModel.deleteMany({});
        await AadhaarMockModel.insertMany(mockData);

        console.log('Aadhaar mock data seeded successfully');
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error seeding data:', error);
    }
};

seedAadhaar();

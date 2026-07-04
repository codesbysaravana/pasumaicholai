import type { Request, Response } from 'express';
import { AadhaarMockModel } from '../models/aadhaar-mock.model';
import { UserModel } from '../models/user.model';
import { ApiError } from '../utils/api-error';
import { asyncHandler } from '../utils/async-handler';

export const checkAadhaar = asyncHandler(async (req: Request, res: Response) => {
    const { aadhaar } = req.body;

    if (!aadhaar || aadhaar.length !== 12) {
        throw new ApiError(400, 'Invalid Aadhaar number. Must be 12 digits.');
    }

    // New requirement: Check if already registered in our production database
    const productionCheck = await UserModel.findOne({ aadhaarFull: aadhaar });
    if (productionCheck) {
        throw new ApiError(409, 'Aadhaar number already registered in our system.');
    }

    const record = await AadhaarMockModel.findOne({ aadhaar });
    if (!record) {
        throw new ApiError(404, 'Aadhaar number not found in record.');
    }

    // Mask the mobile number for security
    const maskedMobile = record.mobile.replace(/.(?=.{4})/g, '*');

    res.status(200).json({
        success: true,
        message: 'Aadhaar found',
        data: {
            mobile: maskedMobile,
            fullMobile: record.mobile, // In a real app, we wouldn't send this, but for Firebase client-side flow we might need it. 
            // Actually, let's just send the masked one and handle the "sending" part.
        },
    });
});

// Mocking OTP sending - In a real app, this would trigger a backend service or be handled by Firebase on client.
export const sendOTP = asyncHandler(async (req: Request, res: Response) => {
    const { mobile } = req.body;
    if (!mobile) {
        throw new ApiError(400, 'Mobile number is required');
    }

    // Logic to send OTP via SMS provider or Firebase Admin SDK would go here.
    console.log(`Sending OTP to ${mobile}`);

    res.status(200).json({
        success: true,
        message: `OTP sent to ${mobile.replace(/.(?=.{4})/g, '*')}`,
    });
});

// Mocking OTP verification
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
    const { mobile, otp, aadhaar } = req.body;

    if (!otp || otp !== '123456') { // Mock OTP for testing
        throw new ApiError(400, 'Invalid OTP');
    }

    const record = await AadhaarMockModel.findOne({ aadhaar });
    if (!record) {
        throw new ApiError(404, 'Aadhaar record not found');
    }

    res.status(200).json({
        success: true,
        message: 'OTP Verified',
        data: record, // Return full details after verification
    });
});

import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { ApiError } from '../utils/api-error';
import { asyncHandler } from '../utils/async-handler';
import { setAuthCookie, signAccessToken } from '../utils/auth-token';

export const registerAadhaarUser = asyncHandler(async (req: Request, res: Response) => {
    const {
        name,
        dob,
        gender,
        mobile,
        email,
        password,
        aadhaar,
        role,
        house,
        street,
        city,
        district,
        state,
        pincode,
        photo
    } = req.body;

    // Basic validation
    if (!mobile || !password || !role || !aadhaar || !email) {
        throw new ApiError(400, 'All mandatory fields (including Email and Aadhaar) must be provided');
    }

    // Check for existing Aadhaar
    const aadhaarExists = await UserModel.findOne({ aadhaarFull: aadhaar });
    if (aadhaarExists) {
        throw new ApiError(409, 'Identity already registered with this Aadhaar number');
    }

    // Check for existing Email
    const emailExists = await UserModel.findOne({ email });
    if (emailExists) {
        throw new ApiError(409, 'A user with this Email already exists');
    }

    const existingMobile = await UserModel.findOne({ mobile });
    if (existingMobile) {
        throw new ApiError(409, 'User already registered with this mobile number');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await UserModel.create({
        fullName: name,
        displayName: name,
        email,
        dob,
        gender,
        mobile,
        passwordHash,
        aadhaarFull: aadhaar,
        aadhaarLast4: aadhaar.slice(-4),
        role,
        house,
        street,
        city,
        district,
        state,
        pincode,
        photo
    });

    const token = signAccessToken(String(user._id), user.role);
    setAuthCookie(res, token);

    res.status(201).json({
        success: true,
        message: 'Aadhaar Registration successful',
        data: {
            id: String(user._id),
            fullName: user.fullName,
            role: user.role,
            mobile: user.mobile
        },
    });
});

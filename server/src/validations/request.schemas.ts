import { z } from 'zod';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectIdMessage = 'Invalid resource identifier';

export const objectIdParamSchema = z.object({
    id: z.string().regex(objectIdPattern, objectIdMessage),
});

export const userIdParamsSchema = z.object({
    userId: z.string().regex(objectIdPattern, objectIdMessage),
});

export const productIdParamsSchema = z.object({
    productId: z.string().regex(objectIdPattern, objectIdMessage),
});

export const postIdParamsSchema = z.object({
    postId: z.string().regex(objectIdPattern, objectIdMessage),
});

export const schemeIdParamsSchema = z.object({
    schemeId: z.string().regex(objectIdPattern, objectIdMessage),
});

export const grievanceIdParamsSchema = z.object({
    grievanceId: z.string().regex(objectIdPattern, objectIdMessage),
});

export const registerBodySchema = z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['farmer', 'admin', 'taluk_admin', 'expert', 'consumer', 'delivery']),
});

export const loginBodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const createProductBodySchema = z.object({
    name: z.string().min(2),
    cropType: z.string().min(2),
    pricePerKg: z.number().positive(),
    quantityKg: z.number().positive(),
    location: z.string().min(2),
    description: z.string().min(10),
});

export const createPostBodySchema = z.object({
    title: z.string().min(5),
    content: z.string().min(20),
});

export const createSchemeBodySchema = z.object({
    title: z.string().min(4),
    summary: z.string().min(10),
    eligibility: z.string().min(5),
});

export const createGrievanceBodySchema = z.object({
    title: z.string().min(5),
    description: z.string().min(20),
    category: z.string().min(3),
});

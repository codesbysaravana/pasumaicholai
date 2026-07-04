import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters."),
  email: z.email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(["farmer", "customer"]),
});

export const productSchema = z.object({
  name: z.string().min(2, "Product name is required."),
  cropType: z.string().min(2, "Crop type is required."),
  pricePerKg: z.coerce.number().positive("Price must be positive."),
  quantityKg: z.coerce.number().positive("Quantity must be positive."),
  location: z.string().min(2, "Location is required."),
  description: z.string().min(10, "Description should be at least 10 characters."),
});

export const blogSchema = z.object({
  title: z.string().min(5, "Title should be at least 5 characters."),
  content: z.string().min(20, "Content should be at least 20 characters."),
});

export const grievanceSchema = z.object({
  title: z.string().min(5, "Title should be at least 5 characters."),
  description: z.string().min(20, "Description should be at least 20 characters."),
  category: z.string().min(3, "Category is required."),
});

export type LoginSchemaInput = z.infer<typeof loginSchema>;
export type RegisterSchemaInput = z.infer<typeof registerSchema>;
export type ProductSchemaInput = z.infer<typeof productSchema>;
export type BlogSchemaInput = z.infer<typeof blogSchema>;
export type GrievanceSchemaInput = z.infer<typeof grievanceSchema>;

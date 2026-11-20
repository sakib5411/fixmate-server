import { z } from "zod";
import { SERVICE_CATEGORIES, SERVICE_MODES } from "../types/models.js";

export const createServiceSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(120),
  category: z.enum(SERVICE_CATEGORIES, { message: "Choose a valid category" }),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(2000),
  image: z.string().url("Service image must be a valid URL"),
  basePrice: z.coerce.number().positive("Base price must be greater than 0"),
  estimatedDuration: z.string().trim().min(1, "Estimated duration is required").max(60),
  serviceMode: z.enum(SERVICE_MODES, { message: "Choose a valid service mode" }),
  serviceArea: z.string().trim().min(2, "Service area is required").max(120),
});

export const updateServiceSchema = createServiceSchema.partial();

export const availabilitySchema = z.object({
  isAvailable: z.boolean({ message: "isAvailable must be true or false" }),
});

export const approvalSchema = z.object({
  approvalStatus: z.enum(["approved", "rejected"], { message: "Approval status must be approved or rejected" }),
});

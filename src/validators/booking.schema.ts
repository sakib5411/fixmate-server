import { z } from "zod";

export const createBookingSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  customerPhone: z.string().trim().min(6, "Phone number is required").max(30),
  address: z.string().trim().min(5, "Address is required").max(300),
  preferredDate: z.coerce.date({ message: "Preferred date is invalid" }),
  problemDescription: z
    .string()
    .trim()
    .min(20, "Problem description must be at least 20 characters")
    .max(2000),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(["accepted", "rejected", "in-progress", "completed"], {
    message: "Invalid status",
  }),
  finalAmount: z.coerce.number().positive("Final amount must be greater than 0").optional(),
});

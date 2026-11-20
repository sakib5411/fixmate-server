import type { ObjectId } from "mongodb";

// ── Shared enums ────────────────────────────────────────────
export const USER_ROLES = ["customer", "technician", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SERVICE_CATEGORIES = [
  "Smartphone",
  "Laptop & PC",
  "AC",
  "Refrigerator",
  "TV",
  "Washing Machine",
  "Electrical",
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const SERVICE_MODES = ["Home Visit", "Shop Drop-off"] as const;
export type ServiceMode = (typeof SERVICE_MODES)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const BOOKING_STATUSES = [
  "requested",
  "accepted",
  "rejected",
  "in-progress",
  "completed",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// ── 1. users ────────────────────────────────────────────────
/**
 * BetterAuth creates and owns the base user document.
 * `role`, `phone`, `area` and `bio` are added through `additionalFields`.
 */
export interface UserDoc {
  _id: ObjectId;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role: UserRole;
  phone?: string | null;
  area?: string | null;
  bio?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── 2. services ─────────────────────────────────────────────
export interface ServiceDoc {
  _id: ObjectId;
  title: string;
  category: ServiceCategory;
  description: string;
  image: string;
  basePrice: number;
  estimatedDuration: string;
  serviceMode: ServiceMode;
  serviceArea: string;
  technicianName: string;
  technicianEmail: string;
  approvalStatus: ApprovalStatus;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── 3. bookings ─────────────────────────────────────────────
export interface StatusHistoryEntry {
  status: BookingStatus;
  changedAt: Date;
}

export interface BookingDoc {
  _id: ObjectId;
  serviceId: string;
  serviceTitle: string;
  serviceImage: string;
  category: ServiceCategory;
  basePrice: number;
  technicianName: string;
  technicianEmail: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  preferredDate: Date;
  problemDescription: string;
  status: BookingStatus;
  finalAmount: number;
  paymentStatus: PaymentStatus;
  statusHistory: StatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

// ── 4. payments ─────────────────────────────────────────────
export interface PaymentDoc {
  _id: ObjectId;
  bookingId: string;
  serviceTitle: string;
  customerName: string;
  customerEmail: string;
  technicianName: string;
  technicianEmail: string;
  amount: number;
  currency: string;
  transactionId: string;
  stripeSessionId: string;
  paymentStatus: "paid";
  paidAt: Date;
}

/** Shape of the authenticated user attached to `req.user` by the JWT middleware. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

import type { Collection } from "mongodb";
import { getDb } from "../config/db.js";
import type { BookingDoc, PaymentDoc, ServiceDoc, UserDoc } from "../types/models.js";

export const COLLECTIONS = {
  users: "users",
  services: "services",
  bookings: "bookings",
  payments: "payments",
} as const;

export const usersCollection = (): Collection<UserDoc> =>
  getDb().collection<UserDoc>(COLLECTIONS.users);

export const servicesCollection = (): Collection<ServiceDoc> =>
  getDb().collection<ServiceDoc>(COLLECTIONS.services);

export const bookingsCollection = (): Collection<BookingDoc> =>
  getDb().collection<BookingDoc>(COLLECTIONS.bookings);

export const paymentsCollection = (): Collection<PaymentDoc> =>
  getDb().collection<PaymentDoc>(COLLECTIONS.payments);

/**
 * Creates every index the app relies on. Safe to run on each boot:
 * `createIndex` is a no-op when the index already exists.
 */
export async function ensureIndexes(): Promise<void> {
  const db = getDb();

  await db.collection<UserDoc>(COLLECTIONS.users).createIndexes([
    { key: { email: 1 }, name: "email_unique", unique: true },
    { key: { role: 1 }, name: "role" },
  ]);

  await db.collection<ServiceDoc>(COLLECTIONS.services).createIndexes([
    { key: { approvalStatus: 1, isAvailable: 1, createdAt: -1 }, name: "public_listing" },
    { key: { technicianEmail: 1, createdAt: -1 }, name: "technician_services" },
    { key: { category: 1 }, name: "category" },
  ]);

  await db.collection<BookingDoc>(COLLECTIONS.bookings).createIndexes([
    { key: { customerEmail: 1, createdAt: -1 }, name: "customer_bookings" },
    { key: { technicianEmail: 1, createdAt: -1 }, name: "technician_bookings" },
    { key: { serviceId: 1, customerEmail: 1, status: 1 }, name: "active_request_lookup" },
    { key: { status: 1 }, name: "booking_status" },
  ]);

  await db.collection<PaymentDoc>(COLLECTIONS.payments).createIndexes([
    { key: { stripeSessionId: 1 }, name: "stripe_session_unique", unique: true },
    { key: { bookingId: 1 }, name: "booking_unique", unique: true },
    { key: { customerEmail: 1, paidAt: -1 }, name: "customer_payments" },
    { key: { technicianEmail: 1 }, name: "technician_payments" },
  ]);

  console.log("✅ Database indexes are ready");
}

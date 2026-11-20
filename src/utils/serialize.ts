import type { BookingDoc, PaymentDoc, ServiceDoc, UserDoc } from "../types/models.js";

/** Converts a MongoDB document into a JSON-friendly object with a string `id`. */
export function serializeService(doc: ServiceDoc) {
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

export function serializeBooking(doc: BookingDoc) {
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

export function serializePayment(doc: PaymentDoc) {
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

export function serializeUser(doc: UserDoc) {
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

/** Escapes user input before it is used inside a MongoDB `$regex`. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

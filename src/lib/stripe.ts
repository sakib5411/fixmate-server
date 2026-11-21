import { ObjectId } from "mongodb";
import Stripe from "stripe";
import { env } from "../config/env.js";
import { bookingsCollection, paymentsCollection } from "../db/collections.js";
import { HttpError } from "../middleware/error.js";
import type { PaymentDoc } from "../types/models.js";

let stripe: Stripe | null = null;

/** Lazily creates the Stripe client so a missing key only breaks payment routes. */
export function getStripe(): Stripe {
  if (!env.stripeSecretKey) {
    throw new HttpError(
      503,
      "Stripe is not configured yet. Add STRIPE_SECRET_KEY to the server .env file."
    );
  }

  if (!stripe) {
    stripe = new Stripe(env.stripeSecretKey);
  }

  return stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(env.stripeSecretKey);
}

/**
 * Saves the payment for a paid Checkout Session exactly once and marks the
 * booking as paid. Safe to call from both the success page and the webhook:
 * payments are unique per booking, so a duplicate insert is ignored.
 */
export async function recordPaidSession(
  session: Stripe.Checkout.Session
): Promise<{ payment: PaymentDoc; created: boolean } | null> {
  const bookingId = session.metadata?.bookingId;
  const customerEmail = session.metadata?.customerEmail;

  if (!bookingId || !customerEmail || !ObjectId.isValid(bookingId)) {
    return null;
  }

  const booking = await bookingsCollection().findOne({
    _id: new ObjectId(bookingId),
  });

  if (!booking) return null;

  const alreadyPaid = await paymentsCollection().findOne({ bookingId });
  if (alreadyPaid) {
    return { payment: alreadyPaid, created: false };
  }

  const intentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? session.id);

  const payment: PaymentDoc = {
    _id: new ObjectId(),
    bookingId,
    serviceTitle: session.metadata?.serviceTitle ?? booking.serviceTitle,
    customerName: session.metadata?.customerName ?? booking.customerName,
    customerEmail,
    technicianName: session.metadata?.technicianName ?? booking.technicianName,
    technicianEmail: session.metadata?.technicianEmail ?? booking.technicianEmail,
    amount: (session.amount_total ?? Math.round(booking.finalAmount * 100)) / 100,
    currency: session.currency ?? "usd",
    transactionId: intentId,
    stripeSessionId: session.id,
    paymentStatus: "paid",
    paidAt: new Date(),
  };

  let created = true;

  try {
    await paymentsCollection().insertOne(payment);
  } catch (error) {
    // The unique index on bookingId/stripeSessionId means the webhook and the
    // success page can race: the loser simply reuses the saved document.
    if ((error as { code?: number }).code === 11000) {
      created = false;
      const saved = await paymentsCollection().findOne({ bookingId });
      if (saved) payment._id = saved._id;
    } else {
      throw error;
    }
  }

  if (created) {
    await bookingsCollection().updateOne(
      { _id: booking._id },
      { $set: { paymentStatus: "paid", updatedAt: new Date() } }
    );
  }

  return { payment, created };
}

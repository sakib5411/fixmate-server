import { Router } from "express";
import type Stripe from "stripe";
import { z } from "zod";
import { bookingsCollection, paymentsCollection } from "../db/collections.js";
import { verifyCustomer, verifyToken } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { validateBody } from "../middleware/validate.js";
import { getStripe, isStripeConfigured, recordPaidSession } from "../lib/stripe.js";
import { env } from "../config/env.js";
import { toObjectId } from "../utils/objectId.js";
import { serializePayment } from "../utils/serialize.js";

export const paymentsRouter = Router();

const checkoutSchema = z.object({
  bookingId: z.string().min(1, "bookingId is required"),
});

// ── Customer: payment history ───────────────────────────────
paymentsRouter.get("/my", verifyToken, verifyCustomer, async (req, res) => {
  const docs = await paymentsCollection()
    .find({ customerEmail: req.user!.email })
    .sort({ paidAt: -1 })
    .toArray();

  res.json({
    success: true,
    data: docs.map(serializePayment),
    meta: { total: docs.length },
  });
});

// ── Customer: start Checkout for a completed, unpaid booking ──
paymentsRouter.post(
  "/create-checkout-session",
  verifyToken,
  verifyCustomer,
  validateBody(checkoutSchema),
  async (req, res) => {
    // The amount always comes from the database, never from the client.
    const booking = await bookingsCollection().findOne({
      _id: toObjectId(req.body.bookingId),
      customerEmail: req.user!.email,
    });

    if (!booking) {
      throw new HttpError(404, "Booking not found");
    }

    if (booking.status !== "completed") {
      throw new HttpError(400, "You can only pay for a completed job");
    }

    if (booking.paymentStatus === "paid") {
      throw new HttpError(400, "This booking is already paid");
    }

    if (!(booking.finalAmount > 0)) {
      throw new HttpError(400, "This booking has no payable amount yet");
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: booking.customerEmail,
      client_reference_id: booking._id.toString(),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(booking.finalAmount * 100),
            product_data: {
              name: booking.serviceTitle,
              description: `Repair job by ${booking.technicianName}`,
            },
          },
        },
      ],
      metadata: {
        bookingId: booking._id.toString(),
        customerEmail: booking.customerEmail,
        serviceTitle: booking.serviceTitle,
        customerName: booking.customerName,
        technicianName: booking.technicianName,
        technicianEmail: booking.technicianEmail,
      },
      success_url: `${env.clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.clientUrl}/payment/cancel`,
    });

    if (!session.url) {
      throw new HttpError(502, "Stripe did not return a checkout URL");
    }

    res.status(201).json({ success: true, data: { url: session.url, sessionId: session.id } });
  }
);

// ── Customer: verify a Checkout Session after redirect ────────
paymentsRouter.get("/verify", verifyToken, verifyCustomer, async (req, res) => {
  const sessionId = String(req.query.session_id ?? "");
  if (!sessionId) {
    throw new HttpError(400, "session_id is required");
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.metadata?.customerEmail !== req.user!.email) {
    throw new HttpError(403, "This payment does not belong to you");
  }

  if (session.payment_status !== "paid") {
    throw new HttpError(400, "This payment has not been completed yet");
  }

  // Saving here covers the main flow; the webhook below is an extra safety net.
  const saved = await recordPaidSession(session);
  if (!saved) {
    throw new HttpError(404, "Booking for this payment no longer exists");
  }

  res.json({
    success: true,
    data: {
      bookingId: saved.payment.bookingId,
      serviceTitle: saved.payment.serviceTitle,
      amount: saved.payment.amount,
      currency: saved.payment.currency,
      transactionId: saved.payment.transactionId,
      paidAt: saved.payment.paidAt,
    },
  });
});

/**
 * POST /api/payments/webhook
 * Mounted with `express.raw()` before the JSON parser — see app.ts.
 * Challenge 4: the same payment must never be saved twice.
 */
export async function stripeWebhookHandler(
  req: import("express").Request,
  res: import("express").Response
): Promise<void> {
  if (!isStripeConfigured()) {
    res.status(503).json({ success: false, message: "Stripe is not configured" });
    return;
  }

  const signature = req.headers["stripe-signature"];

  if (!env.stripeWebhookSecret || typeof signature !== "string") {
    res.status(400).json({ success: false, message: "Missing webhook secret or signature" });
    return;
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      req.body as Buffer,
      signature,
      env.stripeWebhookSecret
    );
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Webhook signature verification failed: ${(error as Error).message}`,
    });
    return;
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    await recordPaidSession(event.data.object);
  }

  res.json({ received: true });
}

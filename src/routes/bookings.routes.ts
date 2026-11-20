import { Router } from "express";
import { ObjectId, type Filter } from "mongodb";
import { bookingsCollection, servicesCollection, usersCollection } from "../db/collections.js";
import { verifyCustomer, verifyTechnician, verifyToken } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { validateBody } from "../middleware/validate.js";
import {
  BOOKING_STATUSES,
  type BookingDoc,
  type BookingStatus,
  type StatusHistoryEntry,
} from "../types/models.js";
import { toObjectId } from "../utils/objectId.js";
import { serializeBooking } from "../utils/serialize.js";
import {
  createBookingSchema,
  updateBookingStatusSchema,
} from "../validators/booking.schema.js";

export const bookingsRouter = Router();

const ACTIVE_STATUSES: BookingStatus[] = ["requested", "accepted", "in-progress"];

/** Status changes the technician is allowed to make. */
const TECHNICIAN_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  requested: ["accepted", "rejected"],
  accepted: ["in-progress"],
  "in-progress": ["completed"],
  completed: [],
  rejected: [],
  cancelled: [],
};

// ── Customer: send a repair request ──
bookingsRouter.post(
  "/",
  verifyToken,
  verifyCustomer,
  validateBody(createBookingSchema),
  async (req, res) => {
    const { serviceId, customerPhone, address, preferredDate, problemDescription } = req.body;

    const service = await servicesCollection().findOne({
      _id: toObjectId(serviceId),
      approvalStatus: "approved",
      isAvailable: true,
    });

    if (!service) {
      throw new HttpError(404, "This service is not available for booking");
    }

    if (service.technicianEmail === req.user!.email) {
      throw new HttpError(400, "You cannot request your own service");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (preferredDate < today) {
      throw new HttpError(400, "Preferred date must be today or a future date");
    }

    const duplicate = await bookingsCollection().findOne({
      serviceId,
      customerEmail: req.user!.email,
      status: { $in: ACTIVE_STATUSES },
    });

    if (duplicate) {
      throw new HttpError(409, "You already have an active request for this service");
    }

    // Read the profile fresh so name changes are reflected without re-login.
    const customer = await usersCollection().findOne({ email: req.user!.email });
    const now = new Date();

    const booking: BookingDoc = {
      _id: new ObjectId(),
      serviceId,
      serviceTitle: service.title,
      serviceImage: service.image,
      category: service.category,
      basePrice: service.basePrice,
      technicianName: service.technicianName,
      technicianEmail: service.technicianEmail,
      customerName: customer?.name ?? req.user!.name,
      customerEmail: req.user!.email,
      customerPhone,
      address,
      preferredDate,
      problemDescription,
      status: "requested",
      finalAmount: service.basePrice,
      paymentStatus: "unpaid",
      statusHistory: [{ status: "requested", changedAt: now }],
      createdAt: now,
      updatedAt: now,
    };

    await bookingsCollection().insertOne(booking);
    res.status(201).json({ success: true, data: serializeBooking(booking) });
  }
);

// ── Customer: my bookings ──
bookingsRouter.get("/my", verifyToken, verifyCustomer, async (req, res) => {
  const docs = await bookingsCollection()
    .find({ customerEmail: req.user!.email })
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ success: true, data: docs.map(serializeBooking) });
});

// ── Technician: bookings assigned to me ──
bookingsRouter.get("/technician", verifyToken, verifyTechnician, async (req, res) => {
  const { status } = req.query as Record<string, string | undefined>;
  const filter: Filter<BookingDoc> = { technicianEmail: req.user!.email };

  if (status && BOOKING_STATUSES.includes(status as BookingStatus)) {
    filter.status = status as BookingStatus;
  }

  const docs = await bookingsCollection()
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ success: true, data: docs.map(serializeBooking) });
});

// ── Customer: cancel (only while still requested) ──
bookingsRouter.patch("/:id/cancel", verifyToken, verifyCustomer, async (req, res) => {
  const booking = await bookingsCollection().findOne({
    _id: toObjectId(String(req.params.id)),
    customerEmail: req.user!.email,
  });

  if (!booking) {
    throw new HttpError(404, "Booking not found");
  }

  if (booking.status !== "requested") {
    throw new HttpError(400, "Only requests that are still 'requested' can be cancelled");
  }

  const entry: StatusHistoryEntry = { status: "cancelled", changedAt: new Date() };
  const updated = await bookingsCollection().findOneAndUpdate(
    { _id: booking._id },
    {
      $set: { status: "cancelled", updatedAt: new Date() },
      $push: { statusHistory: entry },
    },
    { returnDocument: "after" }
  );

  res.json({ success: true, data: serializeBooking(updated!) });
});

// ── Technician: move the job through the status pipeline ──
bookingsRouter.patch(
  "/:id/status",
  verifyToken,
  verifyTechnician,
  validateBody(updateBookingStatusSchema),
  async (req, res) => {
    const booking = await bookingsCollection().findOne({
      _id: toObjectId(String(req.params.id)),
      technicianEmail: req.user!.email,
    });

    if (!booking) {
      throw new HttpError(404, "Booking not found or not assigned to you");
    }

    const nextStatus = req.body.status as BookingStatus;
    const allowed = TECHNICIAN_TRANSITIONS[booking.status] ?? [];

    if (!allowed.includes(nextStatus)) {
      throw new HttpError(
        400,
        `Invalid status change: '${booking.status}' cannot move to '${nextStatus}'`
      );
    }

    let finalAmount = booking.finalAmount;

    if (nextStatus === "completed") {
      const requestedAmount = req.body.finalAmount ?? booking.basePrice;
      if (!(requestedAmount > 0)) {
        throw new HttpError(400, "Final amount must be greater than 0");
      }
      finalAmount = requestedAmount;
    }

    const entry: StatusHistoryEntry = { status: nextStatus, changedAt: new Date() };
    const updated = await bookingsCollection().findOneAndUpdate(
      { _id: booking._id },
      {
        $set: { status: nextStatus, finalAmount, updatedAt: new Date() },
        $push: { statusHistory: entry },
      },
      { returnDocument: "after" }
    );

    res.json({ success: true, data: serializeBooking(updated!) });
  }
);

import { Router } from "express";
import { z } from "zod";
import type { Filter } from "mongodb";
import {
  bookingsCollection,
  paymentsCollection,
  servicesCollection,
  usersCollection,
} from "../db/collections.js";
import { verifyAdmin, verifyToken } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { validateBody } from "../middleware/validate.js";
import {
  APPROVAL_STATUSES,
  BOOKING_STATUSES,
  USER_ROLES,
  type ApprovalStatus,
  type BookingDoc,
  type BookingStatus,
  type ServiceDoc,
  type UserDoc,
  type UserRole,
} from "../types/models.js";
import { toObjectId } from "../utils/objectId.js";
import {
  escapeRegex,
  serializeBooking,
  serializePayment,
  serializeService,
  serializeUser,
} from "../utils/serialize.js";
import { approvalSchema } from "../validators/service.schema.js";

export const adminRouter = Router();

// Every admin route requires a valid token with the admin role.
adminRouter.use(verifyToken, verifyAdmin);

// ── Service moderation ──
adminRouter.get("/services", async (req, res) => {
  const { approvalStatus } = req.query as Record<string, string | undefined>;
  const filter: Filter<ServiceDoc> = {};

  if (approvalStatus && APPROVAL_STATUSES.includes(approvalStatus as ApprovalStatus)) {
    filter.approvalStatus = approvalStatus as ApprovalStatus;
  }

  const docs = await servicesCollection()
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ success: true, data: docs.map(serializeService) });
});

adminRouter.patch(
  "/services/:id/approval",
  validateBody(approvalSchema),
  async (req, res) => {
    const doc = await servicesCollection().findOneAndUpdate(
      { _id: toObjectId(String(req.params.id)) },
      { $set: { approvalStatus: req.body.approvalStatus, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!doc) {
      throw new HttpError(404, "Service not found");
    }

    res.json({ success: true, data: serializeService(doc) });
  }
);

// ── Users ──
adminRouter.get("/users", async (req, res) => {
  const { role, search } = req.query as Record<string, string | undefined>;
  const filter: Filter<UserDoc> = {};

  if (role && USER_ROLES.includes(role as UserRole)) {
    filter.role = role as UserRole;
  }

  if (search?.trim()) {
    const pattern = { $regex: escapeRegex(search.trim()), $options: "i" };
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const docs = await usersCollection()
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ success: true, data: docs.map(serializeUser) });
});

const roleSchema = z.object({
  role: z.enum(USER_ROLES, { message: "Invalid role" }),
});

adminRouter.patch(
  "/users/:id/role",
  validateBody(roleSchema),
  async (req, res) => {
    const userId = String(req.params.id);

    if (userId === req.user!.id) {
      throw new HttpError(400, "You cannot change your own role");
    }

    const doc = await usersCollection().findOneAndUpdate(
      { _id: toObjectId(userId) },
      { $set: { role: req.body.role, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!doc) {
      throw new HttpError(404, "User not found");
    }

    res.json({ success: true, data: serializeUser(doc) });
  }
);

// ── Bookings ──
adminRouter.get("/bookings", async (req, res) => {
  const { status } = req.query as Record<string, string | undefined>;
  const filter: Filter<BookingDoc> = {};

  if (status && BOOKING_STATUSES.includes(status as BookingStatus)) {
    filter.status = status as BookingStatus;
  }

  const docs = await bookingsCollection()
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ success: true, data: docs.map(serializeBooking) });
});

// ── Transactions ──
adminRouter.get("/payments", async (_req, res) => {
  const docs = await paymentsCollection().find().sort({ paidAt: -1 }).toArray();
  const revenue = docs.reduce((sum, payment) => sum + payment.amount, 0);

  res.json({
    success: true,
    data: docs.map(serializePayment),
    meta: { total: docs.length, revenue },
  });
});

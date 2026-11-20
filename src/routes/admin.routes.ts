import { Router } from "express";
import type { Filter } from "mongodb";
import { servicesCollection } from "../db/collections.js";
import { verifyAdmin, verifyToken } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { validateBody } from "../middleware/validate.js";
import {
  APPROVAL_STATUSES,
  type ApprovalStatus,
  type ServiceDoc,
} from "../types/models.js";
import { toObjectId } from "../utils/objectId.js";
import { serializeService } from "../utils/serialize.js";
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

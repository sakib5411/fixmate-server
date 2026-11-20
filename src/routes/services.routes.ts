import { Router } from "express";
import { ObjectId, type Filter, type Sort } from "mongodb";
import { servicesCollection } from "../db/collections.js";
import { verifyTechnician, verifyToken } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { validateBody } from "../middleware/validate.js";
import {
  SERVICE_CATEGORIES,
  SERVICE_MODES,
  type ServiceCategory,
  type ServiceDoc,
  type ServiceMode,
} from "../types/models.js";
import { toObjectId } from "../utils/objectId.js";
import { escapeRegex, serializeService } from "../utils/serialize.js";
import {
  availabilitySchema,
  createServiceSchema,
  updateServiceSchema,
} from "../validators/service.schema.js";

export const servicesRouter = Router();

const SORT_OPTIONS = {
  "price-asc": { basePrice: 1 },
  "price-desc": { basePrice: -1 },
  newest: { createdAt: -1 },
} satisfies Record<string, Sort>;

type SortKey = keyof typeof SORT_OPTIONS;

// ── Public: browse with server-side search / filter / sort / pagination ──
servicesRouter.get("/", async (req, res) => {
  const query = req.query as Record<string, string | undefined>;
  const search = (query.search ?? "").trim();
  const category = query.category ?? "";
  const serviceMode = query.serviceMode ?? "";
  const sort = (query.sort ?? "newest") as SortKey;

  const filter: Filter<ServiceDoc> = {
    approvalStatus: "approved",
    isAvailable: true,
  };

  if (search) {
    const pattern = { $regex: escapeRegex(search), $options: "i" };
    filter.$or = [{ title: pattern }, { category: pattern }];
  }

  if (SERVICE_CATEGORIES.includes(category as ServiceCategory)) {
    filter.category = category as ServiceCategory;
  }

  if (SERVICE_MODES.includes(serviceMode as ServiceMode)) {
    filter.serviceMode = serviceMode as ServiceMode;
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(24, Math.max(1, Number(query.limit) || 9));
  const sortSpec = SORT_OPTIONS[sort] ?? SORT_OPTIONS.newest;

  const collection = servicesCollection();
  const [total, docs] = await Promise.all([
    collection.countDocuments(filter),
    collection
      .find(filter)
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
  ]);

  res.json({
    success: true,
    data: docs.map(serializeService),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      sort: sort in SORT_OPTIONS ? sort : "newest",
    },
  });
});

// ── Technician: own services (any approval status) ──
servicesRouter.get("/technician/my", verifyToken, verifyTechnician, async (req, res) => {
  const docs = await servicesCollection()
    .find({ technicianEmail: req.user!.email })
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ success: true, data: docs.map(serializeService) });
});

// ── Public: single approved & available service ──
servicesRouter.get("/:id", async (req, res) => {
  const doc = await servicesCollection().findOne({
    _id: toObjectId(String(req.params.id)),
    approvalStatus: "approved",
    isAvailable: true,
  });

  if (!doc) {
    throw new HttpError(404, "Service not found");
  }

  res.json({ success: true, data: serializeService(doc) });
});

// ── Technician: create ──
servicesRouter.post(
  "/",
  verifyToken,
  verifyTechnician,
  validateBody(createServiceSchema),
  async (req, res) => {
    const now = new Date();
    const doc: ServiceDoc = {
      _id: new ObjectId(),
      ...(req.body as Omit<ServiceDoc, "_id" | "technicianName" | "technicianEmail" | "approvalStatus" | "isAvailable" | "createdAt" | "updatedAt">),
      technicianName: req.user!.name,
      technicianEmail: req.user!.email,
      approvalStatus: "pending",
      isAvailable: true,
      createdAt: now,
      updatedAt: now,
    };

    await servicesCollection().insertOne(doc);
    res.status(201).json({ success: true, data: serializeService(doc) });
  }
);

// ── Technician: update (editing sends it back to pending) ──
servicesRouter.patch(
  "/:id",
  verifyToken,
  verifyTechnician,
  validateBody(updateServiceSchema),
  async (req, res) => {
    const doc = await servicesCollection().findOneAndUpdate(
      { _id: toObjectId(String(req.params.id)), technicianEmail: req.user!.email },
      {
        $set: {
          ...req.body,
          approvalStatus: "pending",
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!doc) {
      throw new HttpError(404, "Service not found or you do not own it");
    }

    res.json({ success: true, data: serializeService(doc) });
  }
);

// ── Technician: toggle availability ──
servicesRouter.patch(
  "/:id/availability",
  verifyToken,
  verifyTechnician,
  validateBody(availabilitySchema),
  async (req, res) => {
    const doc = await servicesCollection().findOneAndUpdate(
      { _id: toObjectId(String(req.params.id)), technicianEmail: req.user!.email },
      { $set: { isAvailable: req.body.isAvailable, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!doc) {
      throw new HttpError(404, "Service not found or you do not own it");
    }

    res.json({ success: true, data: serializeService(doc) });
  }
);

// ── Technician: delete ──
servicesRouter.delete("/:id", verifyToken, verifyTechnician, async (req, res) => {
  const result = await servicesCollection().deleteOne({
    _id: toObjectId(String(req.params.id)),
    technicianEmail: req.user!.email,
  });

  if (result.deletedCount === 0) {
    throw new HttpError(404, "Service not found or you do not own it");
  }

  res.json({ success: true, message: "Service deleted" });
});

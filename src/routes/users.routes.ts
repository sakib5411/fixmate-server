import { Router } from "express";
import { z } from "zod";
import { usersCollection } from "../db/collections.js";
import { verifyToken } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { validateBody } from "../middleware/validate.js";
import { toObjectId } from "../utils/objectId.js";
import { serializeUser } from "../utils/serialize.js";

export const usersRouter = Router();

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  area: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(500).optional(),
  image: z.string().url("Profile image must be a valid URL").optional(),
});

// GET /api/users/me
usersRouter.get("/me", verifyToken, async (req, res) => {
  const user = await usersCollection().findOne({ _id: toObjectId(req.user!.id) });
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  res.json({ success: true, data: serializeUser(user) });
});

// PATCH /api/users/profile — every logged-in user
usersRouter.patch(
  "/profile",
  verifyToken,
  validateBody(profileSchema),
  async (req, res) => {
    const user = await usersCollection().findOneAndUpdate(
      { _id: toObjectId(req.user!.id) },
      { $set: { ...req.body, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!user) {
      throw new HttpError(404, "User not found");
    }

    res.json({ success: true, data: serializeUser(user) });
  }
);

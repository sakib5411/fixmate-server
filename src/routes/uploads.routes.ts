import { Router } from "express";
import multer from "multer";
import { uploadImageToImgBB } from "../lib/imgbb.js";
import { verifyToken } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";

export const uploadsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new HttpError(400, "Only image files are allowed"));
      return;
    }
    callback(null, true);
  },
});

// POST /api/uploads  (multipart/form-data, field name: "image")
uploadsRouter.post("/", verifyToken, upload.single("image"), async (req, res) => {
  if (!req.file) {
    throw new HttpError(400, "Image file is required");
  }

  const url = await uploadImageToImgBB(req.file.buffer, req.file.originalname);
  res.status(201).json({ success: true, data: { url } });
});

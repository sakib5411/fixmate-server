import { env } from "../config/env.js";
import { HttpError } from "../middleware/error.js";

interface ImgBBResponse {
  success?: boolean;
  data?: { url?: string; display_url?: string };
  error?: { message?: string };
}

/** Uploads an image buffer to ImgBB and returns the hosted URL. */
export async function uploadImageToImgBB(buffer: Buffer, fileName: string): Promise<string> {
  if (!env.imgbbApiKey) {
    throw new HttpError(503, "Image upload is not configured (IMGBB_API_KEY is missing)");
  }

  const form = new FormData();
  form.append("key", env.imgbbApiKey);
  form.append("name", fileName.replace(/\.[^.]+$/, ""));
  form.append("image", new Blob([new Uint8Array(buffer)]), fileName);

  const response = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: form,
  });

  const payload = (await response.json().catch(() => ({}))) as ImgBBResponse;

  if (!response.ok || !payload.success || !payload.data?.url) {
    throw new HttpError(502, payload.error?.message ?? "ImgBB upload failed");
  }

  return payload.data.url;
}

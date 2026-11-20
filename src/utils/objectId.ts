import { ObjectId } from "mongodb";
import { HttpError } from "../middleware/error.js";

/** Converts a route param into an ObjectId, rejecting malformed ids with 400. */
export function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) {
    throw new HttpError(400, "Invalid id");
  }
  return new ObjectId(id);
}

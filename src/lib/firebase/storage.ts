import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { getFirebaseApp } from "@/lib/firebase/client";

export function tryGetFirebaseStorage() {
  try {
    return getStorage(getFirebaseApp());
  } catch {
    return null;
  }
}

export async function uploadFulfillmentPhoto(
  ticketId: string,
  file: File,
  metadata?: Record<string, string>,
): Promise<string> {
  const storage = tryGetFirebaseStorage();
  if (!storage) {
    throw new Error("Firebase Storage is not configured.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storageRef = ref(
    storage,
    `fulfillment-proofs/${ticketId}/${Date.now()}-${safeName}`,
  );
  await uploadBytes(storageRef, file, {
    contentType: file.type || "image/jpeg",
    customMetadata: metadata,
  });
  return getDownloadURL(storageRef);
}

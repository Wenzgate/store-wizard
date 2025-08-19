/**
 * Upload helpers — dev stub storage (no binary persisted).
 * We only validate metadata and return normalized FileRef objects with a pseudo URL.
 */

import { MAX_FILE_SIZE_BYTES, MAX_FILES, MAX_FILES_PER_ITEM, FileRefSchema } from "@/schemas/quote";
import type { QuoteRequest, StoreItem } from "@/types/quote";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export interface ValidatedFileRef {
  id: string;
  name: string;
  mime: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  size: number;
  url: string; // pseudo local path (dev)
  sha256?: string;
}

/** Validate a single metadata-only file descriptor */
export function validateFileMeta(file: unknown): ValidatedFileRef {
  const parsed = FileRefSchema.parse(file);
  if (!ALLOWED_MIME.has(parsed.mime)) {
    throw new Error(`Type de fichier non autorisé: ${parsed.mime}`);
  }
  if (parsed.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Fichier trop volumineux: ${(parsed.size / (1024 * 1024)).toFixed(1)} Mo (max ${(MAX_FILE_SIZE_BYTES / 1024 / 1024).toFixed(0)} Mo)`);
  }
  return {
    ...parsed,
    url: `/uploads/${parsed.id}-${sanitizeName(parsed.name)}`,
  };
}

/** Validate arrays for the whole payload (global + per item) */
export function validateAllFiles(payload: QuoteRequest): {
  globals: ValidatedFileRef[];
  perItem: Record<string, ValidatedFileRef[]>;
} {
  const globals = (payload.files ?? []).map(validateFileMeta);
  if (globals.length > MAX_FILES) {
    throw new Error(`Trop de fichiers globaux (max ${MAX_FILES}).`);
  }

  const perItem: Record<string, ValidatedFileRef[]> = {};
  for (const it of payload.items ?? []) {
    const list = (it.files ?? []).map(validateFileMeta);
    if (list.length > MAX_FILES_PER_ITEM) {
      throw new Error(`Trop de fichiers pour un élément (max ${MAX_FILES_PER_ITEM}).`);
    }
    perItem[it.id] = list;
  }

  return { globals, perItem };
}

/** Dev "storage": nothing is actually written; we just return paths. */
export async function storeFilesDev(_files: ValidatedFileRef[]): Promise<void> {
  // No-op: in real impl (S3/local), we'd persist binary and update URLs if needed.
  return;
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

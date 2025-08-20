// src/components/forms/FileDrop.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MAX_FILE_SIZE_BYTES } from "@/schemas/quote";

type AcceptMap = Record<string, string[]>; // ex: { "image/*": [".jpg",".png"], "application/pdf": [".pdf"] }

export interface FileDropProps {
  name?: string;
  /** Fichiers sélectionnés (contrôlé) */
  value?: File[];
  /** Callback changement (contrôlé) */
  onChange?: (files: File[]) => void;
  /** Limites */
  maxFiles?: number; // par défaut: 6 (côté item)
  maxSize?: number; // bytes, par défaut: 5 Mo (schemas)
  accept?: AcceptMap; // par défaut images + pdf
  /** Accessibilité & UI */
  label?: string;
  helperText?: string;
  error?: string;
  className?: string;
}

/** Drag&Drop multi-fichiers avec validation taille/MIME + preview images. */
export default function FileDrop({
  name,
  value,
  onChange,
  maxFiles = 6,
  maxSize = MAX_FILE_SIZE_BYTES,
  accept = {
    "image/*": [".jpg", ".jpeg", ".png", ".webp"],
    "application/pdf": [".pdf"],
  },
  label = "Ajouter des fichiers",
  helperText,
  error,
  className,
}: FileDropProps) {
  const [local, setLocal] = useState<File[]>(value ?? []);
  const [drag, setDrag] = useState(false);
  const [msgs, setMsgs] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // sync contrôlé
  useEffect(() => {
    if (value) setLocal(value);
  }, [value]);

  const exts = useMemo(() => Object.values(accept).flat(), [accept]);
  const mimes = useMemo(() => Object.keys(accept), [accept]);
  const acceptAttr = useMemo(() => [...exts, ...mimes].join(","), [exts, mimes]);

  const emit = useCallback(
    (files: File[]) => {
      setLocal(files);
      onChange?.(files);
    },
    [onChange]
  );

  const validate = useCallback(
    (files: File[]): { ok: File[]; errors: string[] } => {
      const errors: string[] = [];
      const ok: File[] = [];

      for (const f of files) {
        // taille
        if (f.size > maxSize) {
          errors.push(`“${f.name}” dépasse la taille max (${(maxSize / (1024 * 1024)).toFixed(0)} Mo).`);
          continue;
        }
        // MIME / extension
        const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
        const mimeOk = mimes.some((m) => (m.endsWith("/*") ? f.type.startsWith(m.replace("/*", "/")) : f.type === m));
        const extOk = exts.includes(ext);
        if (!mimeOk && !extOk) {
          errors.push(`Type non autorisé pour “${f.name}”.`);
          continue;
        }
        ok.push(f);
      }

      // limite de quantité
      if (ok.length + local.length > maxFiles) {
        const remain = Math.max(0, maxFiles - local.length);
        errors.push(`Maximum ${maxFiles} fichier(s). Vous pouvez encore ajouter ${remain}.`);
        ok.splice(remain);
      }

      return { ok, errors };
    },
    [exts, local.length, maxFiles, maxSize, mimes]
  );

  const onInputChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (e) => {
      // capture l’élément et les fichiers immédiatement
      const inputEl = e.currentTarget;
      const files = Array.from(inputEl.files ?? []);

      const { ok, errors } = validate(files);
      setMsgs(errors);
      if (ok.length) emit([...local, ...ok]);

      // reset input de manière sûre (évite e.currentTarget=null)
      if (inputRef.current) {
        inputRef.current.value = "";
      } else {
        // fallback au cas où
        try {
          inputEl.value = "";
        } catch {
          /* ignore */
        }
      }
    },
    [emit, local, validate]
  );

  const onDrop = useCallback(
    (ev: React.DragEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      setDrag(false);
      const files = Array.from(ev.dataTransfer.files ?? []);
      const { ok, errors } = validate(files);
      setMsgs(errors);
      if (ok.length) emit([...local, ...ok]);
    },
    [emit, local, validate]
  );

  const onRemove = useCallback(
    (idx: number) => {
      const next = local.filter((_, i) => i !== idx);
      emit(next);
    },
    [emit, local]
  );

  // revoke ObjectURLs on unmount
  useEffect(() => {
    return () => {
      local.forEach((f) => {
        const anyF = f as any;
        if (anyF.previewUrl) URL.revokeObjectURL(anyF.previewUrl);
      });
    };
  }, [local]);

  return (
    <div className={["w-full", className].filter(Boolean).join(" ")}>
      <label className="block text-sm font-medium mb-1">{label}</label>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDrag(false);
        }}
        onDrop={onDrop}
        tabIndex={0}
        role="button"
        aria-label="Déposer des fichiers ou parcourir"
        className={[
          "relative flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-4 text-center outline-none transition",
          drag
            ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand))/0.05]"
            : "border-border hover:bg-black/5 dark:hover:bg-white/5",
          error ? "ring-2 ring-red-500/50" : "",
        ].join(" ")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={!!error}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          id={name}
          name={name}
          type="file"
          className="sr-only"
          accept={acceptAttr}
          multiple
          onChange={onInputChange}
        />
        <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} transition={{ duration: 0.15 }}>
          <p className="text-sm">
            Glissez‑déposez vos fichiers ici ou <span className="underline">cliquez pour parcourir</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            {helperText ??
              `Types autorisés: ${exts.join(", ")} • Taille max ${(maxSize / (1024 * 1024)).toFixed(0)} Mo • Jusqu’à ${maxFiles} fichiers`}
          </p>
        </motion.div>
      </div>

      {/* Preview */}
      {local.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {local.map((f, idx) => {
            const isImage = f.type.startsWith("image/");
            const previewUrl = isImage ? URL.createObjectURL(f) : null;

            return (
              <li key={idx} className="group relative overflow-hidden rounded-xl border border-border">
                <div className="flex items-center gap-3 p-2">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-black/5 dark:bg-white/10">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl ?? ""}
                        alt={f.name}
                        className="h-full w-full object-cover"
                        onLoad={() => previewUrl && URL.revokeObjectURL(previewUrl)}
                      />
                    ) : (
                      <span className="text-xs font-semibold">PDF</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm" title={f.name}>
                      {f.name}
                    </p>
                    <p className="text-xs text-muted">{(f.size / 1024).toFixed(0)} Ko</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(idx)}
                    className="rounded-md border border-border px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand))]"
                    aria-label={`Supprimer ${f.name}`}
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Errors */}
      <div className="mt-2 space-y-1">
        {error ? (
          <p id={`${name}-error`} className="text-xs text-red-600">
            {error}
          </p>
        ) : null}
        {msgs.map((m, i) => (
          <p key={i} className="text-xs text-red-600">
            {m}
          </p>
        ))}
      </div>
    </div>
  );
}

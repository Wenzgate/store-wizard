"use client";

import { useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface HelpTooltipProps {
  /** Contenu du tooltip (texte court privilégié) */
  content: string;
  /** Optionnel: étiquette visible custom au lieu de l’icône ? */
  label?: string | React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  /** Id pour associer à un champ via aria-describedby */
  describedElementId?: string;
}

export default function HelpTooltip({
  content,
  label,
  className,
  side = "top",
  describedElementId,
}: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const tipId = `${id}-tip`;
  const btnRef = useRef<HTMLButtonElement>(null);

  const position =
    side === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 -translate-y-2"
      : side === "bottom"
      ? "top-full left-1/2 -translate-x-1/2 translate-y-2"
      : side === "left"
      ? "right-full top-1/2 -translate-y-1/2 -translate-x-2"
      : "left-full top-1/2 -translate-y-1/2 translate-x-2";

  return (
    <span className={["relative inline-flex", className].filter(Boolean).join(" ")}>
      <button
        ref={btnRef}
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs text-muted hover:text-fg hover:border-fg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand))]"
        aria-describedby={open ? tipId : undefined}
        aria-label={typeof label === "string" ? label : "Aide"}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        {label ? label : "?"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={tipId}
            role="tooltip"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={`pointer-events-none absolute z-50 max-w-xs w-100 rounded-md border border-border bg-bg px-3 py-2 text-xs text-fg shadow`}
            style={{ transformOrigin: "center" }}
            data-side={side}
          >
            <div className={position + " absolute"} aria-hidden />
            {content}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optionnel: lier un champ externe via aria-describedby */}
      {describedElementId ? (
        <span id={`${describedElementId}-helper`} hidden>
          {content}
        </span>
      ) : null}
    </span>
  );
}

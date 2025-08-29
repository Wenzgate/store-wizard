"use client";

import { motion } from "framer-motion";
// util classe → classe
function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
  }
  
import { useEffect, useMemo } from "react";

type Step = {
  id: string;
  label: string;
  /** Optionnel: description courte affichée sous l’étiquette active */
  hint?: string;
};

export interface StepperProps {
  steps: Step[];
  /** Index courant (0-based) */
  current: number;
  /** Annonce accessible dynamique (aria-live) */
  ariaLabel?: string;
  /** Affiche la barre de progression */
  showProgressBar?: boolean;
  className?: string;
}

/** Stepper accessible + micro-animations */
export default function Stepper({
  steps,
  current,
  ariaLabel = "Progression du formulaire",
  showProgressBar = true,
  className,
}: StepperProps) {
  const clamped = Math.max(0, Math.min(current, steps.length - 1));
  const pct = steps.length > 1 ? (clamped / (steps.length - 1)) * 100 : 100;

  const stepLabel = useMemo(() => steps[clamped]?.label ?? "", [steps, clamped]);

  // announce on change (for SR)
  useEffect(() => {
    const region = document.getElementById("stepper-live-region");
    if (region) region.textContent = `Étape ${clamped + 1} sur ${steps.length}: ${stepLabel}`;
  }, [clamped, steps.length, stepLabel]);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">
          Étape {clamped + 1}
          <span className="text-muted"> / {steps.length}</span>
        </div>
        <div className="text-sm text-muted truncate" aria-hidden>
          {stepLabel}
        </div>
      </div>

      {showProgressBar && (
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-brand-alt" aria-label={ariaLabel}>
          <motion.div
            className="h-2 rounded-full bg-brand"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          />
        </div>
      )}

      <ol className="mt-3 flex w-full items-center justify-between gap-2" aria-label="Étapes">
        {steps.map((s, i) => {
          const isDone = i < clamped;
          const isCurrent = i === clamped;
          return (
            <li key={s.id} className="flex min-w-0 items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                  isDone && "bg-brand text-brand-foreground border-transparent",
                  isCurrent && !isDone && "border-brand text-brand",
                  !isCurrent && !isDone && "border-border text-muted"
                )}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Étape ${i + 1}: ${s.label}`}
                title={s.label}
              >
                {isDone ? (
                  <span aria-hidden>✓</span>
                ) : (
                  <span aria-hidden>{i + 1}</span>
                )}
              </div>
              <span className="hidden text-xs text-muted sm:block truncate max-w-28" title={s.label}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {steps[clamped]?.hint ? (
        <motion.p
          key={steps[clamped].id + "-hint"}
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-xs text-muted"
        >
          {steps[clamped]?.hint}
        </motion.p>
      ) : null}

      <span id="stepper-live-region" className="sr-only" aria-live="polite" />
    </div>
  );
}

// simple classNames utility (local to avoid extra deps)


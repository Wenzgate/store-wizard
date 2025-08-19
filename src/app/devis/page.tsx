// src/app/devis/page.tsx
"use client";

import { z } from "zod";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { FormProvider, useForm, useFormContext as useRHFContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";

import Stepper from "@/components/ui/Stepper";
import HelpTooltip from "@/components/ui/HelpTooltip";
import StoreItemRepeater from "@/components/forms/StoreItemRepeater";

import {
  QuoteRequestSchema,
  TimingEnum,
  BudgetRangeEnum,
  ContactPreferenceEnum,
  MIN_DIM_CM,
  MAX_DIM_CM,
} from "@/schemas/quote";
import type { StoreItem } from "@/types/quote";

// ---------- Types & Const ----------

// ⚠️ IMPORTANT: on tape le formulaire avec le "type d'entrée" du schéma Zod.
// Cela permet d'avoir consentRgpd: false par défaut tout en validant z.literal(true) au submit.
type QuoteFormValues = z.input<typeof QuoteRequestSchema>;

const DRAFT_KEY = "quote_draft_v1";

type StepId =
  | "intro"
  | "projectType"
  | "quantity"
  | "items"
  | "timing"
  | "contact"
  | "recap"
  | "done";

const STEPS: { id: StepId; label: string; hint?: string }[] = [
  { id: "intro", label: "Accueil", hint: "Présentation du parcours (2–3 min)." },
  { id: "projectType", label: "Type de projet", hint: "Pose complète, fourniture seule, etc." },
  { id: "quantity", label: "Quantité", hint: "Nombre de stores à estimer (approximatif possible)." },
  { id: "items", label: "Détails des stores", hint: "Un bloc par store (dimensions, commande…)." },
  { id: "timing", label: "Délai & RDV", hint: "Vos préférences de timing." },
  { id: "contact", label: "Coordonnées", hint: "Pour vous recontacter (RGPD)." },
  { id: "recap", label: "Récapitulatif", hint: "Vérifiez avant envoi." },
  { id: "done", label: "Confirmation" },
];

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

function track(event: string, payload: Record<string, unknown> = {}) {
  const data = { event, ...payload, ts: Date.now() };
  // Stub analytics
  console.log("[track]", data);
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(data);
}

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/** Retire les File temporaires du brouillon pour pouvoir sérialiser en localStorage */
function stripFilesForDraft(data: QuoteFormValues): QuoteFormValues {
  const clone: QuoteFormValues = JSON.parse(JSON.stringify({ ...data, files: undefined as any }));
  if (clone.items) {
    clone.items = clone.items.map((it: any) => ({ ...it, files: undefined as any }));
  }
  return clone;
}

function ensureItemsCount(items: StoreItem[], count: number): StoreItem[] {
  const next = [...items];
  while (next.length < count) {
    next.push({
      id: uid(),
      type: "ROLLER",
      quantity: 1,
      mount: "INSIDE",
      control: "CHAIN",
      dims: { width: 100, height: 120, toleranceCm: 0 },
      notes: "",
    } as StoreItem);
  }
  if (next.length > count) next.length = count;
  return next;
}

/** Comparaison légère: même longueur et mêmes ids (évite setValue inutiles) */
function sameItemsById(a: StoreItem[], b: StoreItem[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if ((a[i]?.id ?? "") !== (b[i]?.id ?? "")) return false;
  }
  return true;
}

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

// ---------- Page ----------

export default function DevisPage() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentStep = STEPS[currentIdx];

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(QuoteRequestSchema),
    mode: "onSubmit",
    defaultValues: {
      id: undefined,
      createdAt: undefined,
      items: [],
      files: [],
      customer: {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        contactPref: "" as any, // l’utilisateur choisira
      },
      project: {
        address: {
          street: "",
          postalCode: "",
          city: "",
          country: "Belgique",
        },
        timing: "" as any, // l’utilisateur choisira
        budget: "" as any, // l’utilisateur choisira
        notes: "",
      },
      
      acceptEstimateOnly: true,
      honeypot: "",
      source: "WEBSITE" as any,
      locale: "fr",
    },
  });

  const { handleSubmit, watch, setValue, getValues, reset, formState } = form;

  // ---- Draft: load on mount, then autosave
  const didHydrateRef = useRef(false);
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { data: QuoteFormValues; step?: StepId };
        reset(parsed.data);
        const idx = Math.max(0, STEPS.findIndex((s) => s.id === (parsed.step ?? "intro")));
        setCurrentIdx(idx === -1 ? 0 : idx);
      } catch {
        // ignore
      }
    }
    didHydrateRef.current = true;
  }, [reset]);

  useEffect(() => {
    if (!didHydrateRef.current) return;
    const sub = watch((value) => {
      const toSave = stripFilesForDraft(value as QuoteFormValues);
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: toSave, step: STEPS[currentIdx].id }));
    });
    return () => sub.unsubscribe();
  }, [watch, currentIdx]);

  // ---- Handlers
  const goNext = async () => {
    const ok = await validateStep(currentStep.id);
    if (!ok) return;
    setCurrentIdx((i) => Math.min(i + 1, STEPS.length - 1));
    track("step_next", { step: currentStep.id });
  };
  const goBack = () => {
    setCurrentIdx((i) => Math.max(i - 1, 0));
    track("step_back", { step: currentStep.id });
  };
  const jumpTo = (id: StepId) => {
    const idx = STEPS.findIndex((s) => s.id === id);
    if (idx >= 0) setCurrentIdx(idx);
  };

  // announce step views
  useEffect(() => {
    track("step_view", { step: currentStep.id });
  }, [currentStep.id]);

  // ---- Mémo: onEnsureItems stabilisé pour éviter la boucle infinie
  const handleEnsureItems = useCallback(
    (n: number) => {
      const cur = (getValues("items") ?? []) as StoreItem[];
      const next = ensureItemsCount(cur, Math.max(1, Number(n || 1)));
      if (!sameItemsById(cur, next)) {
        setValue("items", next, { shouldDirty: true, shouldTouch: false, shouldValidate: false });
      }
    },
    [getValues, setValue]
  );

  // ---- Step validations (subset of schema)
  async function validateStep(stepId: StepId): Promise<boolean> {
    const v = getValues();
    if (stepId === "projectType") {
      return true;
    }
    if (stepId === "quantity") {
      const qty = (v.items?.length ?? 0) || 0;
      if (qty < 1) {
        alert("Indiquez au moins 1 store (vous pourrez ajuster ensuite).");
        return false;
      }
      return true;
    }
    if (stepId === "items") {
      for (const it of v.items ?? []) {
        if (!it?.dims) return false;
        if (it.dims.width < MIN_DIM_CM || it.dims.width > MAX_DIM_CM) return false;
        if (it.dims.height < MIN_DIM_CM || it.dims.height > MAX_DIM_CM) return false;
      }
      return true;
    }
    if (stepId === "timing") {
      return true;
    }
    if (stepId === "contact") {
      const c = v.customer as any;
      if (!c?.firstName || !c?.lastName || !c?.email) {
        alert("Merci de compléter vos coordonnées (prénom, nom, email).");
        return false;
      }
      if (!v.consentRgpd) {
        alert("Le consentement RGPD est requis.");
        return false;
      }
      return true;
    }
    return true;
  }

  // ---- Final submit
  const onSubmit = async (data: QuoteFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);

    // transformer File[] temporaires en FileRef minimal (id/name/mime/size)
    const payload: QuoteFormValues = {
      ...data,
      items: (data.items ?? []).map((it: any) => ({
        ...it,
        files: Array.isArray(it.files)
          ? (it.files as File[]).map((f) => ({
              id: uid(),
              name: f.name,
              mime: (f.type || "application/pdf") as any,
              size: f.size,
            }))
          : undefined,
      })),
      files: Array.isArray((data as any).files)
        ? ((data as any).files as File[]).map((f) => ({
            id: uid(),
            name: f.name,
            mime: (f.type || "application/pdf") as any,
            size: f.size,
          }))
        : undefined,
    };

    // Validation stricte complète (sortie schéma)
    const parsed = QuoteRequestSchema.safeParse(payload);
    if (!parsed.success) {
      console.error(parsed.error.flatten());
      alert("Certaines informations sont manquantes ou invalides. Vérifiez le formulaire.");
      setIsSubmitting(false);
      jumpTo("items");
      return;
    }

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const msg = await safeReadError(res);
        setSubmitError(`Échec d’envoi: ${msg}`);
        setIsSubmitting(false);
        return;
      }

      track("quote_submit", { items: parsed.data.items.length });
      localStorage.removeItem(DRAFT_KEY);
      setCurrentIdx(STEPS.findIndex((s) => s.id === "done"));
    } catch (e: any) {
      setSubmitError(e?.message ?? "Erreur réseau");
    } finally {
      setIsSubmitting(false);
    }
  };

  async function safeReadError(res: Response) {
    try {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await res.json();
        return j?.error || j?.message || JSON.stringify(j);
      }
      return await res.text();
    } catch {
      return res.statusText || `HTTP ${res.status}`;
    }
  }

  // ---- Derived
  const stepperData = useMemo(
    () => STEPS.map((s) => ({ id: s.id, label: s.label, hint: s.hint })),
    []
  );

  // ---- Render
  return (
    <FormProvider {...form}>
      <form
        className="mx-auto max-w-3xl"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-live="polite"
      >
        <h1 className="mb-4 text-2xl font-bold">Devis Stores</h1>
        <Stepper steps={stepperData} current={currentIdx} />

        <div className="mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {currentStep.id === "intro" && <StepIntro onStart={() => setCurrentIdx(1)} />}
              {currentStep.id === "projectType" && <StepProjectType />}
              {currentStep.id === "quantity" && (
                <StepQuantity onEnsureItems={handleEnsureItems} />
              )}
              {currentStep.id === "items" && <StepItems />}
              {currentStep.id === "timing" && <StepTiming />}
              {currentStep.id === "contact" && <StepContact />}
              {currentStep.id === "recap" && <StepRecap onEdit={(id) => jumpTo(id)} />}
              {currentStep.id === "done" && <StepDone />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Nav buttons */}
        {currentStep.id !== "done" && (
          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={currentIdx === 0 || isSubmitting}
              className={cn(
                "rounded-xl border border-border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg:white/10 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand))]",
                (currentIdx === 0 || isSubmitting) && "opacity-50"
              )}
            >
              Retour
            </button>

            {currentStep.id === "recap" ? (
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-[hsl(var(--brand))] px-5 py-2 text-sm font-semibold text-[hsl(var(--brand-foreground))] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(var(--brand))] disabled:opacity-60"
              >
                {isSubmitting ? "Envoi…" : "Envoyer la demande"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={isSubmitting}
                className="rounded-xl bg-[hsl(var(--brand))] px-5 py-2 text-sm font-semibold text-[hsl(var(--brand-foreground))] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(var(--brand))] disabled:opacity-60"
              >
                Continuer
              </button>
            )}
          </div>
        )}

        {submitError && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {submitError}
          </p>
        )}

        {/* Debug small */}
        {formState.isDirty && (
          <p className="mt-3 text-xs text-muted">Brouillon enregistré automatiquement.</p>
        )}
      </form>
    </FormProvider>
  );
}

// ---------- Steps ----------

function StepIntro({ onStart }: { onStart: () => void }) {
  return (
    <section className="space-y-4">
      <p>
        👋 Bienvenue chez Anderlecht Décor ! Répondez à quelques questions (2–3 min) pour une
        estimation indicative BANDALUX.
      </p>
      <ul className="list-disc pl-5 text-sm text-muted">
        <li>1 question à la fois, ton simple et clair.</li>
        <li>“Je ne sais pas” disponible avec mini‑aides.</li>
        <li>Pas de tarifs automatiques — un conseiller vous recontactera.</li>
      </ul>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onStart}
          className="rounded-xl bg-[hsl(var(--brand))] px-5 py-2 text-sm font-semibold text-[hsl(var(--brand-foreground))] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(var(--brand))]"
        >
          Commencer
        </button>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem(DRAFT_KEY);
            location.reload();
          }}
          className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          Réinitialiser
        </button>
      </div>
    </section>
  );
}

function StepProjectType() {
  const { register, setValue, watch } = useFormContextStrict();
  const note = watch("project.notes") ?? "";

  const addTag = (t: string) => {
    const cur = watch("project.notes") ?? "";
    const pref = cur.includes("[Projet]") ? cur : `[Projet:${t}] ` + cur;
    setValue("project.notes" as any, pref, { shouldDirty: true });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Votre projet</h2>
        <HelpTooltip content="Cette information oriente notre conseil (pas bloquant si vous hésitez)." />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CardButton onClick={() => addTag("Pose+Mesure")}>Mesure & Pose</CardButton>
        <CardButton onClick={() => addTag("FournitureSeule")}>Fourniture seule</CardButton>
        <CardButton onClick={() => addTag("Rénovation")}>Rénovation</CardButton>
        <CardButton onClick={() => addTag("Neuf")}>Construction neuve</CardButton>
      </div>

      <div className="rounded-2xl border border-border p-4">
        <label className="mb-2 block text-sm font-medium">Notes (optionnel)</label>
        <textarea
          {...register("project.notes" as const)}
          className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
          rows={3}
          placeholder="Ajoutez des précisions utiles (ex: orientation soleil, contraintes)."
        />
        <Idk hint="Vous hésitez ? Laissez vide, on clarifiera par téléphone." />
        {note && (
          <p className="mt-2 text-xs text-muted">
            Tag projet ajouté dans les notes :{" "}
            <code className="rounded bg-black/5 px-1 py-0.5">[Projet…]</code>
          </p>
        )}
      </div>
    </section>
  );
}

function StepQuantity({ onEnsureItems }: { onEnsureItems: (n: number) => void }) {
  const { register, watch } = useFormContextStrict();
  const items = watch("items") ?? [];
  const [qty, setQty] = useState(items.length || 1);

  // Important: onEnsureItems est stable (useCallback parent) + effet dépend UNIQUEMENT de qty
  useEffect(() => {
    onEnsureItems(qty);
  }, [qty, onEnsureItems]);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Combien de stores ?</h2>
        <HelpTooltip content="Indiquez un nombre approximatif si nécessaire. Vous pourrez ajuster ensuite." />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          step={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
          aria-label="Nombre de stores"
          className="w-28 rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
        />
        <Idk
          actionLabel="Mettre 1 par défaut"
          onAction={() => setQty(1)}
          hint="Pas sûr ? Choisissez 1 pour démarrer et vous pourrez dupliquer après."
        />
      </div>

      <p className="text-sm text-muted">Actuellement : {qty} élément(s) dans la liste.</p>
      {/* Hidden bind to form (length only informatif) */}
      <input type="hidden" {...register("items.length" as any)} value={qty} readOnly />
    </section>
  );
}

function StepItems() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Détails des stores</h2>
        <HelpTooltip
          content={`Mesurez en cm (min ${MIN_DIM_CM} – max ${MAX_DIM_CM}). En cas de doute, utilisez “Je ne sais pas”.`}
        />
      </div>
      <p className="text-sm text-muted">
        Astuce: si vous hésitez sur la pose tableau vs recouvrement, cliquez sur le “?” à côté de l’étiquette.
      </p>
      <StoreItemRepeater />
      <Idk hint="Vous n’êtes pas sûr des dimensions ? Donnez une estimation. Nous confirmerons lors d’une éventuelle visite." />
    </section>
  );
}

function StepTiming() {
  const { register, watch } = useFormContextStrict();
  const t = watch("project.timing");
  const b = watch("project.budget");

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Délai & budget</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Délai souhaité</label>
          <select
            {...register("project.timing" as const)}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {TimingEnum.options.map((v) => {
              const val = v as (typeof TimingEnum)["options"][number];
              return (
                <option key={String(val)} value={String(val)}>
                  {timingLabel(val)}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Budget estimatif</label>
          <select
            {...register("project.budget" as const)}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {BudgetRangeEnum.options.map((v) => {
              const val = v as (typeof BudgetRangeEnum)["options"][number];
              return (
                <option key={String(val)} value={String(val)}>
                  {budgetLabel(val)}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <Idk hint="Pas d’urgence ? Choisissez “Flexible”. Pour le budget, vous pouvez laisser vide." />
    </section>
  );
}

function StepContact() {
  const { register } = useFormContextStrict();

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Vos coordonnées</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Prénom</label>
          <input
            type="text"
            {...register("customer.firstName" as const, { required: true })}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Nom</label>
          <input
            type="text"
            {...register("customer.lastName" as const, { required: true })}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            {...register("customer.email" as const, { required: true })}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Téléphone (optionnel)</label>
          <input
            type="tel"
            {...register("customer.phone" as const)}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
            placeholder="+32…"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Préférence de contact</label>
          <select
            {...register("customer.contactPref" as const)}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {ContactPreferenceEnum.options.map((v) => (
              <option key={String(v)} value={String(v)}>
                {contactPrefLabel(v as (typeof ContactPreferenceEnum)["options"][number])}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Ville</label>
          <input
            type="text"
            {...register("project.address.city" as const)}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Code postal</label>
          <input
            type="text"
            {...register("project.address.postalCode" as const)}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Rue</label>
          <input
            type="text"
            {...register("project.address.street" as const)}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-2 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            {...register("consentRgpd" as const, { required: true })}
            className="h-4 w-4 rounded border-border"
          />
          J’accepte que mes données soient utilisées pour me recontacter dans le cadre de cette demande.
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            {...register("acceptEstimateOnly" as const)}
            className="h-4 w-4 rounded border-border"
          />
          Je comprends qu’il s’agit d’une estimation indicative, sans valeur contractuelle.
        </label>
        {/* Honeypot */}
        <input
          type="text"
          {...register("honeypot" as const)}
          className="sr-only"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
      </div>

      <Idk hint="Nous ne partageons jamais vos informations. Vous pouvez choisir votre canal préféré (email, téléphone, WhatsApp)." />
    </section>
  );
}

function StepRecap({ onEdit }: { onEdit: (id: StepId) => void }) {
  const { getValues } = useFormContextStrict();
  const v = getValues();
  const [showJson, setShowJson] = useState(false);
  const json = useMemo(() => JSON.stringify(stripFilesForDraft(v), null, 2), [v]);

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(json);
      track("recap_copy_json");
    } catch {
      // ignore
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Vérification</h2>
        <button
          type="button"
          onClick={() => setShowJson((s) => !s)}
          className="rounded-xl border border-border px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/10"
        >
          {showJson ? "Masquer JSON" : "Voir JSON"}
        </button>
      </div>

      <div className="rounded-2xl border border-border p-4">
        <h3 className="mb-2 text-sm font-medium">Coordonnées</h3>
        <p className="text-sm">
          {v.customer?.firstName} {v.customer?.lastName} — {v.customer?.email}
          {v.customer?.phone ? ` — ${v.customer.phone}` : ""}
        </p>
        <p className="text-sm text-muted">
          {[
            v.project?.address?.street,
            v.project?.address?.postalCode,
            v.project?.address?.city,
            v.project?.address?.country,
          ]
            .filter(Boolean)
            .join(", ") || "Adresse non précisée"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {v.project?.timing && <Badge>{timingLabel(v.project.timing as any)}</Badge>}
          {v.project?.budget && <Badge>{budgetLabel(v.project.budget as any)}</Badge>}
        </div>
        <div className="mt-2">
          <button
            type="button"
            onClick={() => onEdit("contact")}
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
          >
            Modifier coordonnées
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(v.items ?? []).map((it: any, i: number) => (
          <article key={it?.id ?? i} className="rounded-2xl border border-border p-4">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Store #{i + 1}</h4>
              <button
                type="button"
                onClick={() => onEdit("items")}
                className="rounded-md border border-border px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
              >
                Modifier
              </button>
            </div>
            <dl className="space-y-1 text-sm">
              <Row label="Type">{typeLabel(it.type as any)}</Row>
              <Row label="Quantité">{it.quantity}</Row>
              <Row label="Pose">{mountLabel(it.mount as any)}</Row>
              {it.windowType && <Row label="Ouverture">{windowLabel(it.windowType as any)}</Row>}
              {it.room && (
                <Row label="Pièce">
                  {roomLabel(it.room as any)}
                  {it.roomLabel ? ` (${it.roomLabel})` : ""}
                </Row>
              )}
              <Row label="Commande">{controlLabel(it as any)}</Row>
              <Row label="Dimensions">
                {it.dims?.width} × {it.dims?.height} cm
                {it.dims?.toleranceCm != null ? ` (± ${it.dims.toleranceCm} cm)` : ""}
              </Row>
              {it.fabric && (
                <Row label="Tissu">
                  {[it.fabric.brand ?? "BANDALUX", it.fabric.collection, it.fabric.colorName, it.fabric.colorCode]
                    .filter(Boolean)
                    .join(" · ")}
                </Row>
              )}
              {it.color?.tone && (
                <Row label="Couleur">
                  {it.color.tone === "CUSTOM" ? it.color.custom ?? "Personnalisée" : (it.color.tone as any)}
                </Row>
              )}
              {it.notes && (
                <Row label="Notes">
                  <em>{it.notes}</em>
                </Row>
              )}
            </dl>
          </article>
        ))}
      </div>

      {/* JSON */}
      {showJson && (
        <div className="rounded-2xl border border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Payload JSON (aperçu)</span>
            <button
              type="button"
              onClick={copyJson}
              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
            >
              Copier
            </button>
          </div>
          <pre className="max-h-72 overflow-auto rounded-lg bg-black/5 p-3 text-xs leading-relaxed dark:bg-white/10">
            {json}
          </pre>
        </div>
      )}
    </section>
  );
}

function StepDone() {
  return (
    <section className="space-y-3 text-center">
      <h2 className="text-lg font-semibold">Merci 🙌</h2>
      <p className="text-sm text-muted">
        Votre demande a été envoyée. Un conseiller Anderlecht Décor reviendra vers vous rapidement
        pour affiner l’estimation.
      </p>
      <a
        href="/"
        className="inline-block rounded-xl border border-border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
      >
        Retour à l’accueil
      </a>
    </section>
  );
}

// ---------- Small shared UI ----------

function CardButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-border p-4 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand))]"
    >
      {children}
    </button>
  );
}

function Idk({
  hint,
  actionLabel,
  onAction,
}: {
  hint: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mt-3">
      <details className="group rounded-xl border border-border p-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between">
          <span>Je ne sais pas</span>
          <span aria-hidden className="transition group-open:rotate-180">⌄</span>
        </summary>
        <div className="mt-2 text-muted">
          <p>{hint}</p>
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="mt-2 rounded-md border border-border px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </details>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs">
      {children}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px,1fr] gap-2">
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// ---------- Labels ----------

function typeLabel(v?: StoreItem["type"]) {
  return (
    {
      VENETIAN: "Vénitien",
      ROMAN: "Bateau",
      ROLLER: "Enrouleur",
      PLEATED: "Plissé",
      CASSETTE: "Coffre / Box",
    } as const
  )[v ?? "ROLLER"] as string;
}
function mountLabel(v: StoreItem["mount"]) {
  return (
    {
      INSIDE: "Pose tableau (intérieur)",
      OUTSIDE: "Pose murale (recouvrement)",
      CEILING: "Pose plafond",
    } as const
 )[v];
}
function windowLabel(v: NonNullable<StoreItem["windowType"]>) {
  return (
    {
      WINDOW_SINGLE: "Fenêtre",
      WINDOW_DOOR: "Porte-fenêtre",
      BAY: "Baie",
      CORNER: "Angle",
      SKYLIGHT: "Vélux",
      OTHER: "Autre",
    } as const
  )[v];
}
function roomLabel(v: NonNullable<StoreItem["room"]>) {
  return (
    {
      LIVING: "Salon",
      KITCHEN: "Cuisine",
      BEDROOM: "Chambre",
      BATHROOM: "Salle de bain",
      OFFICE: "Bureau",
      OTHER: "Autre",
    } as const
  )[v];
}
function controlLabel(it: StoreItem) {
  const side = it.controlSide ? (it.controlSide === "LEFT" ? " — côté gauche" : " — côté droit") : "";
  if (it.control === "CHAIN") return "Chaînette" + side;
  if (it.control === "CRANK") return "Manivelle" + side;
  if (it.control === "MOTOR") {
    const power =
      (it as any).motor?.power === "WIRED"
        ? " — filaire"
        : (it as any).motor?.power === "BATTERY"
        ? " — batterie"
        : (it as any).motor?.power === "SOLAR"
        ? " — solaire"
        : "";
    const brand = (it as any).motor?.brand ? ` (${(it as any).motor.brand})` : "";
    return "Motorisation" + power + brand;
  }
  return "Ressort";
}

// Enums -> labels
function timingLabel(v: (typeof TimingEnum)["options"][number]) {
  const map: Record<string, string> = {
    ASAP: "Dès que possible",
    W2_4: "Sous 2–4 semaines",
    FLEX: "Flexible",
    JUST_INFO: "Information uniquement",
  };
  return map[String(v)] ?? String(v);
}

function budgetLabel(v: (typeof BudgetRangeEnum)["options"][number]) {
  const map: Record<string, string> = {
    LOW: "Budget serré",
    MID: "Standard",
    HIGH: "Premium",
    LUX: "Haut de gamme",
  };
  return map[String(v)] ?? String(v);
}

function contactPrefLabel(v: (typeof ContactPreferenceEnum)["options"][number]) {
  const map: Record<string, string> = {
    EMAIL: "Email",
    PHONE: "Téléphone",
    WHATSAPP: "WhatsApp",
  };
  return map[String(v)] ?? String(v);
}

// ---------- RHF helper ----------

function useFormContextStrict() {
  const ctx = useRHFContext<QuoteFormValues>();
  if (!ctx || !(ctx as any).register) {
    // Aide au debug si un jour un sous-composant est rendu en dehors du provider
    throw new Error("useFormContextStrict must be used within a <FormProvider>.");
  }
  return ctx;
}

"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { z } from "zod";
import {
  ControlEnum,
  ControlSideEnum,
  FabricOpacityEnum,
  MIN_DIM_CM,
  MAX_DIM_CM,
  MIN_TOLERANCE_CM,
  MAX_TOLERANCE_CM,
  MotorPowerEnum,
  MountTypeEnum,
  RoomTypeEnum,
  StoreTypeEnum,
  WindowTypeEnum,
  MAX_FILES_PER_ITEM,
  MAX_FILE_SIZE_BYTES,
} from "@/schemas/quote";
import type { QuoteRequest, StoreItem } from "@/types/quote";
import FileDrop from "./FileDrop";
import HelpTooltip from "../ui/HelpTooltip";
import { motion, AnimatePresence } from "framer-motion";

type FormShape = QuoteRequest; // le parent doit fournir FormProvider<QuoteRequest>

const enumToOptions = (e: z.ZodEnum<[string, ...string[]]>) =>
  (e.options as readonly string[]).map((v) => ({ value: v, label: v }));

const labels = {
  type: {
    VENETIAN: "Vénitien",
    ROMAN: "Bateau",
    ROLLER: "Enrouleur",
    PLEATED: "Plissé",
    CASSETTE: "Coffre / Box",
  },
  mount: {
    INSIDE: "Pose tableau (intérieur)",
    OUTSIDE: "Pose murale (recouvrement)",
    CEILING: "Pose plafond",
  },
  control: {
    CHAIN: "Chaînette",
    MOTOR: "Motorisation",
    CRANK: "Manivelle",
    SPRING: "Ressort",
  },
  side: {
    LEFT: "Gauche",
    RIGHT: "Droite",
  },
  motorPower: {
    WIRED: "Filaire",
    BATTERY: "Batterie",
    SOLAR: "Solaire",
  },
  room: {
    LIVING: "Salon",
    KITCHEN: "Cuisine",
    BEDROOM: "Chambre",
    BATHROOM: "Salle de bain",
    OFFICE: "Bureau",
    OTHER: "Autre",
  },
  window: {
    WINDOW_SINGLE: "Fenêtre",
    WINDOW_DOOR: "Porte-fenêtre",
    BAY: "Baie",
    CORNER: "Angle",
    SKYLIGHT: "Vélux",
    OTHER: "Autre",
  },
  opacity: {
    SHEER: "Voilage",
    TRANSLUCENT: "Translucide",
    DIMOUT: "Occultant léger",
    BLACKOUT: "Total occultant",
    SCREEN: "Screen (facteur ouverture)",
  },
};

export interface StoreItemRepeaterProps {
  name?: "items"; // par défaut "items"
  maxItems?: number;
  className?: string;
}

/**
 * Repeater pour les lignes "StoreItem".
 * Utilise le FormProvider parent (QuoteRequest).
 */
export default function StoreItemRepeater({ name = "items", maxItems = 20, className }: StoreItemRepeaterProps) {
  const { control, register, formState, watch, setValue } = useFormContext<FormShape>();
  const { fields, append, remove } = useFieldArray({ control, name });

  const items = watch(name) as StoreItem[] | undefined;

  const addDefault = () => {
    if (fields.length >= maxItems) return;
    const def: StoreItem = {
      id: crypto.randomUUID(),
      type: "ROLLER",
      quantity: 1,
      mount: "INSIDE",
      control: "CHAIN",
      dims: { width: 100, height: 120, toleranceCm: 0 },
      fabric: null,
      color: null,
      notes: "",
      files: [],
    };
    append(def);
  };

  return (
    <div className={["space-y-4", className].filter(Boolean).join(" ")}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Vos stores</h2>
        <button
          type="button"
          onClick={addDefault}
          className="rounded-xl border border-border px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand))]"
          aria-label="Ajouter un store"
        >
          + Ajouter
        </button>
      </div>

      <AnimatePresence initial={false}>
        {fields.map((field, index) => {
          const base = `${name}.${index}`;
          const itemErr = (formState.errors as any)?.[name]?.[index];

          const controlVal = (items?.[index]?.control ?? "CHAIN") as typeof ControlEnum._def.values[number];
          const requiresSide = controlVal === "CHAIN" || controlVal === "CRANK";
          const isMotor = controlVal === "MOTOR";

          return (
            <motion.fieldset
              key={field.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="rounded-2xl border border-border p-4"
              aria-describedby={itemErr ? `${base}-error` : undefined}
            >
              <legend className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">Store #{index + 1}</span>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand))]"
                  aria-label={`Supprimer le store ${index + 1}`}
                >
                  Supprimer
                </button>
              </legend>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {/* Type & Quantité */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Type de store</label>
                  <select
                    {...register(`${base}.type` as const)}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    aria-invalid={!!itemErr?.type}
                  >
                    {(StoreTypeEnum.options as readonly string[]).map((v) => (
                      <option key={v} value={v}>
                        {labels.type[v as keyof typeof labels.type] ?? v}
                      </option>
                    ))}
                  </select>
                  {itemErr?.type && <FieldError msg={itemErr.type.message} />}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Quantité</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    {...register(`${base}.quantity` as const, { valueAsNumber: true })}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    aria-invalid={!!itemErr?.quantity}
                  />
                  {itemErr?.quantity && <FieldError msg={itemErr.quantity.message} />}
                </div>

                {/* Pose & Ouverture */}
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                    Pose
                    <HelpTooltip content="Pose tableau = dans l'embrasure. Recouvrement = sur le mur autour de la fenêtre." />
                  </label>
                  <select
                    {...register(`${base}.mount` as const)}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                  >
                    {(MountTypeEnum.options as readonly string[]).map((v) => (
                      <option key={v} value={v}>
                        {labels.mount[v as keyof typeof labels.mount] ?? v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Type d’ouverture</label>
                  <select
                    {...register(`${base}.windowType` as const)}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {(WindowTypeEnum.options as readonly string[]).map((v) => (
                      <option key={v} value={v}>
                        {labels.window[v as keyof typeof labels.window] ?? v}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pièce */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Pièce</label>
                  <select
                    {...register(`${base}.room` as const)}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {(RoomTypeEnum.options as readonly string[]).map((v) => (
                      <option key={v} value={v}>
                        {labels.room[v as keyof typeof labels.room] ?? v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Précision pièce (optionnel)</label>
                  <input
                    type="text"
                    {...register(`${base}.roomLabel` as const)}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    placeholder="Ex: baie vitrée salon"
                  />
                </div>

                {/* Commande */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Commande</label>
                  <select
                    {...register(`${base}.control` as const)}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                  >
                    {(ControlEnum.options as readonly string[]).map((v) => (
                      <option key={v} value={v}>
                        {labels.control[v as keyof typeof labels.control] ?? v}
                      </option>
                    ))}
                  </select>
                </div>

                {requiresSide && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Côté de manoeuvre</label>
                    <select
                      {...register(`${base}.controlSide` as const)}
                      className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    >
                      {(ControlSideEnum.options as readonly string[]).map((v) => (
                        <option key={v} value={v}>
                          {labels.side[v as keyof typeof labels.side] ?? v}
                        </option>
                      ))}
                    </select>
                    {itemErr?.controlSide && <FieldError msg={itemErr.controlSide.message} />}
                  </div>
                )}

                {isMotor && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Alimentation moteur</label>
                      <select
                        {...register(`${base}.motor.power` as const)}
                        className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                        aria-invalid={!!itemErr?.motor?.power}
                      >
                        <option value="">—</option>
                        {(MotorPowerEnum.options as readonly string[]).map((v) => (
                          <option key={v} value={v}>
                            {labels.motorPower[v as keyof typeof labels.motorPower] ?? v}
                          </option>
                        ))}
                      </select>
                      {itemErr?.motor?.power && <FieldError msg={itemErr.motor.power.message} />}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Marque moteur (optionnel)</label>
                      <input
                        type="text"
                        {...register(`${base}.motor.brand` as const)}
                        className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                        placeholder="Ex: Somfy"
                      />
                    </div>
                  </>
                )}

                {/* Dimensions */}
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                    Largeur (cm)
                    <HelpTooltip content={`Min ${MIN_DIM_CM} – Max ${MAX_DIM_CM} cm`} />
                  </label>
                  <input
                    type="number"
                    min={MIN_DIM_CM}
                    max={MAX_DIM_CM}
                    step={0.1}
                    {...register(`${base}.dims.width` as const, { valueAsNumber: true })}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    aria-invalid={!!itemErr?.dims?.width}
                  />
                  {itemErr?.dims?.width && <FieldError msg={itemErr.dims.width.message} />}
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                    Hauteur (cm)
                    <HelpTooltip content={`Min ${MIN_DIM_CM} – Max ${MAX_DIM_CM} cm`} />
                  </label>
                  <input
                    type="number"
                    min={MIN_DIM_CM}
                    max={MAX_DIM_CM}
                    step={0.1}
                    {...register(`${base}.dims.height` as const, { valueAsNumber: true })}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    aria-invalid={!!itemErr?.dims?.height}
                  />
                  {itemErr?.dims?.height && <FieldError msg={itemErr.dims.height.message} />}
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                    Tolérance (cm)
                    <HelpTooltip content={`Jeu accepté: ${MIN_TOLERANCE_CM}–${MAX_TOLERANCE_CM} cm`} />
                  </label>
                  <input
                    type="number"
                    min={MIN_TOLERANCE_CM}
                    max={MAX_TOLERANCE_CM}
                    step={0.5}
                    {...register(`${base}.dims.toleranceCm` as const, { valueAsNumber: true })}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                  />
                </div>

                {/* Tissu */}
                <div className="md:col-span-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Marque tissu</label>
                    <select
                      {...register(`${base}.fabric.brand` as const)}
                      className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      <option value="BANDALUX">BANDALUX</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Collection</label>
                    <input
                      type="text"
                      {...register(`${base}.fabric.collection` as const)}
                      className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                      placeholder="Ex: Polyscreen 550"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Couleur</label>
                    <input
                      type="text"
                      {...register(`${base}.fabric.colorName` as const)}
                      className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                      placeholder="Ex: White / Grey"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Code couleur</label>
                    <input
                      type="text"
                      {...register(`${base}.fabric.colorCode` as const)}
                      className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                      placeholder="Ex: 300 / PS550"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Opacité</label>
                    <select
                      {...register(`${base}.fabric.opacity` as const)}
                      className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      {(FabricOpacityEnum.options as readonly string[]).map((v) => (
                        <option key={v} value={v}>
                          {labels.opacity[v as keyof typeof labels.opacity] ?? v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Facteur d’ouverture (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      {...register(`${base}.fabric.opennessFactorPct` as const, { valueAsNumber: true })}
                      className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Couleur générale */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Teinte structure</label>
                  <select
                    {...register(`${base}.color.tone` as const)}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    <option value="WHITE">Blanc</option>
                    <option value="NEUTRAL">Neutre</option>
                    <option value="WARM">Chaud</option>
                    <option value="COOL">Froid</option>
                    <option value="DARK">Foncé</option>
                    <option value="CUSTOM">Personnalisé</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Détail couleur (si personnalisé)</label>
                  <input
                    type="text"
                    {...register(`${base}.color.custom` as const)}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    placeholder="Ex: RAL 7016"
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Notes</label>
                  <textarea
                    {...register(`${base}.notes` as const)}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    placeholder="Précisions utiles (ex: contraintes, prises de mesures approximatives...)"
                  />
                </div>

                {/* Fichiers */}
                <div className="md:col-span-2">
                  <FileDrop
                    name={`${base}.files`}
                    value={(items?.[index]?.files as unknown as File[]) ?? []}
                    onChange={(files) => {
                      // stocker côté form: File[] temporaire (sera transformé en FileRef côté upload)
                      setValue(`${base}.files` as any, files as any, { shouldDirty: true, shouldValidate: false });
                    }}
                    maxFiles={MAX_FILES_PER_ITEM}
                    maxSize={MAX_FILE_SIZE_BYTES}
                    helperText="Ajoutez des photos/plan pour cet élément."
                    error={(itemErr?.files as any)?.message}
                  />
                </div>
              </div>

              {itemErr && (
                <p id={`${base}-error`} className="mt-2 text-xs text-red-600">
                  Corrigez les erreurs surlignées ci‑dessus.
                </p>
              )}
            </motion.fieldset>
          );
        })}
      </AnimatePresence>

      {fields.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Aucun store ajouté. Utilisez “Ajouter” pour créer votre premier élément.
        </div>
      )}
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

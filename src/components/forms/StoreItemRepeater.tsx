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

/** --- Helpers enums : compatible Zod v4 "classic" --- */
type ZodEnumLike = z.ZodTypeAny;

const getEnumValues = (schema: ZodEnumLike): string[] => {
  const anySchema = schema as any;
  // z.enum([...]) → .options (array)
  if (Array.isArray(anySchema?.options)) return [...anySchema.options];
  // z.nativeEnum(...) → .enum (object)
  if (anySchema?.enum && typeof anySchema.enum === "object") {
    return Object.values(anySchema.enum).filter(
      (v): v is string => typeof v === "string"
    );
  }
  throw new Error("Unsupported enum schema passed to getEnumValues");
};

const enumToOptions = (schema: ZodEnumLike) =>
  getEnumValues(schema).map((v) => ({ value: v, label: v }));

/** --- Libellés UI --- */
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

/** --- Types de chemins RHF pour items --- */
type ItemKey =
  | "type"
  | "quantity"
  | "mount"
  | "windowType"
  | "room"
  | "roomLabel"
  | "control"
  | "controlSide"
  | "motor.power"
  | "motor.brand"
  | "dims.width"
  | "dims.height"
  | "dims.toleranceCm"
  | "fabric.brand"
  | "fabric.collection"
  | "fabric.colorName"
  | "fabric.colorCode"
  | "fabric.opacity"
  | "fabric.opennessFactorPct"
  | "color.tone"
  | "color.custom"
  | "notes"
  | "files";

type ItemPath<K extends ItemKey> = `items.${number}.${K}`;

export interface StoreItemRepeaterProps {
  name?: "items"; // par défaut "items"
  maxItems?: number;
  className?: string;
}

/**
 * Repeater pour les lignes "StoreItem".
 * Utilise le FormProvider parent (QuoteRequest).
 */
export default function StoreItemRepeater({
  name = "items",
  maxItems = 20,
  className,
}: StoreItemRepeaterProps) {
  const { control, register, formState, watch, setValue } =
    useFormContext<FormShape>();
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
          const itemErr = (formState.errors as any)?.items?.[index];

          type ControlValue = z.infer<typeof ControlEnum>;
          const controlVal = (items?.[index]?.control ?? "CHAIN") as ControlValue;
          const requiresSide = controlVal === "CHAIN" || controlVal === "CRANK";
          const isMotor = controlVal === "MOTOR";

          return (
            <motion.fieldset
              key={field.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="rounded-2xl border border-border p-4"
              aria-describedby={itemErr ? `items.${index}-error` : undefined}
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
                  <label className="mb-1 block text-sm font-medium">
                    Type de store
                  </label>
                  <select
                    {...register(
                      `items.${index}.type` as ItemPath<"type">
                    )}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    aria-invalid={!!itemErr?.type}
                  >
                    {getEnumValues(StoreTypeEnum).map((v) => (
                      <option key={v} value={v}>
                        {labels.type[v as keyof typeof labels.type] ?? v}
                      </option>
                    ))}
                  </select>
                  {itemErr?.type && <FieldError msg={itemErr.type.message} />}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Quantité
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    {...register(
                      `items.${index}.quantity` as ItemPath<"quantity">,
                      { valueAsNumber: true }
                    )}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    aria-invalid={!!itemErr?.quantity}
                  />
                  {itemErr?.quantity && (
                    <FieldError msg={itemErr.quantity.message} />
                  )}
                </div>

                {/* Pose & Ouverture */}
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                    Pose
                    <HelpTooltip content="Pose tableau = dans l'embrasure. Recouvrement = sur le mur autour de la fenêtre." />
                  </label>
                  <select
                    {...register(
                      `items.${index}.mount` as ItemPath<"mount">
                    )}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                  >
                    {getEnumValues(MountTypeEnum).map((v) => (
                      <option key={v} value={v}>
                        {labels.mount[v as keyof typeof labels.mount] ?? v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Type d’ouverture
                  </label>
                  <select
                    {...register(
                      `items.${index}.windowType` as ItemPath<"windowType">
                    )}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {getEnumValues(WindowTypeEnum).map((v) => (
                      <option key={v} value={v}>
                        {labels.window[v as keyof typeof labels.window] ?? v}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pièce */}
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Pièce
                  </label>
                  <select
                    {...register(
                      `items.${index}.room` as ItemPath<"room">
                    )}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {getEnumValues(RoomTypeEnum).map((v) => (
                      <option key={v} value={v}>
                        {labels.room[v as keyof typeof labels.room] ?? v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Précision pièce (optionnel)
                  </label>
                  <input
                    type="text"
                    {...register(
                      `items.${index}.roomLabel` as ItemPath<"roomLabel">
                    )}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    placeholder="Ex: baie vitrée salon"
                  />
                </div>

                {/* Commande */}
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Commande
                  </label>
                  <select
                    {...register(
                      `items.${index}.control` as ItemPath<"control">
                    )}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                  >
                    {getEnumValues(ControlEnum).map((v) => (
                      <option key={v} value={v}>
                        {labels.control[v as keyof typeof labels.control] ?? v}
                      </option>
                    ))}
                  </select>
                </div>

                {requiresSide && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Côté de manoeuvre
                    </label>
                    <select
                      {...register(
                        `items.${index}.controlSide` as ItemPath<"controlSide">
                      )}
                      className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    >
                      {getEnumValues(ControlSideEnum).map((v) => (
                        <option key={v} value={v}>
                          {labels.side[v as keyof typeof labels.side] ?? v}
                        </option>
                      ))}
                    </select>
                    {itemErr?.controlSide && (
                      <FieldError msg={itemErr.controlSide.message} />
                    )}
                  </div>
                )}

                {isMotor && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Alimentation moteur
                      </label>
                      <select
                        {...register(
                          `items.${index}.motor.power` as ItemPath<"motor.power">
                        )}
                        className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                        aria-invalid={!!itemErr?.motor?.power}
                      >
                        <option value="">—</option>
                        {getEnumValues(MotorPowerEnum).map((v) => (
                          <option key={v} value={v}>
                            {labels.motorPower[
                              v as keyof typeof labels.motorPower
                            ] ?? v}
                          </option>
                        ))}
                      </select>
                      {itemErr?.motor?.power && (
                        <FieldError msg={itemErr.motor.power.message} />
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Marque moteur (optionnel)
                      </label>
                      <input
                        type="text"
                        {...register(
                          `items.${index}.motor.brand` as ItemPath<"motor.brand">
                        )}
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
                    {...register(
                      `items.${index}.dims.width` as ItemPath<"dims.width">,
                      { valueAsNumber: true }
                    )}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    aria-invalid={!!itemErr?.dims?.width}
                  />
                  {itemErr?.dims?.width && (
                    <FieldError msg={itemErr.dims.width.message} />
                  )}
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
                    {...register(
                      `items.${index}.dims.height` as ItemPath<"dims.height">,
                      { valueAsNumber: true }
                    )}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    aria-invalid={!!itemErr?.dims?.height}
                  />
                  {itemErr?.dims?.height && (
                    <FieldError msg={itemErr.dims.height.message} />
                  )}
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
                    {...register(
                      `items.${index}.dims.toleranceCm` as ItemPath<"dims.toleranceCm">,
                      { valueAsNumber: true }
                    )}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                  />
                </div>

                {/* Tissu */}
                <div className="md:col-span-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Marque tissu
                    </label>
                    <select
                      {...register(
                        `items.${index}.fabric.brand` as ItemPath<"fabric.brand">
                      )}
                      className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      <option value="BANDALUX">BANDALUX</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Collection
                    </label>
                    <input
                      type="text"
                      {...register(
                        `items.${index}.fabric.collection` as ItemPath<"fabric.collection">
                      )}
                      className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                      placeholder="Ex: Polyscreen 550"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Couleur
                    </label>
                    <input
                      type="text"
                      {...register(
                        `items.${index}.fabric.colorName` as ItemPath<"fabric.colorName">
                      )}
                      className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                      placeholder="Ex: White / Grey"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Code couleur
                    </label>
                    <input
                      type="text"
                      {...register(
                        `items.${index}.fabric.colorCode` as ItemPath<"fabric.colorCode">
                      )}
                      className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                      placeholder="Ex: 300 / PS550"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Opacité
                    </label>
                    <select
                      {...register(
                        `items.${index}.fabric.opacity` as ItemPath<"fabric.opacity">
                      )}
                      className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      {getEnumValues(FabricOpacityEnum).map((v) => (
                        <option key={v} value={v}>
                          {labels.opacity[v as keyof typeof labels.opacity] ??
                            v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Facteur d’ouverture (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      {...register(
                        `items.${index}.fabric.opennessFactorPct` as ItemPath<"fabric.opennessFactorPct">,
                        { valueAsNumber: true }
                      )}
                      className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Couleur générale */}
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Teinte structure
                  </label>
                  <select
                    {...register(
                      `items.${index}.color.tone` as ItemPath<"color.tone">
                    )}
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
                  <label className="mb-1 block text-sm font-medium">
                    Détail couleur (si personnalisé)
                  </label>
                  <input
                    type="text"
                    {...register(
                      `items.${index}.color.custom` as ItemPath<"color.custom">
                    )}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    placeholder="Ex: RAL 7016"
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">
                    Notes
                  </label>
                  <textarea
                    {...register(
                      `items.${index}.notes` as ItemPath<"notes">
                    )}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                    placeholder="Précisions utiles (ex: contraintes, prises de mesures approximatives...)"
                  />
                </div>

                {/* Fichiers */}
                <div className="md:col-span-2">
                  <FileDrop
                    name={`items.${index}.files`}
                    value={(items?.[index]?.files as unknown as File[]) ?? []}
                    onChange={(files) => {
                      // On stocke temporairement File[] côté form (transformé en FileRef au moment de l’upload côté serveur)
                      setValue(
                        `items.${index}.files` as ItemPath<"files">,
                        files as any,
                        { shouldDirty: true, shouldValidate: false }
                      );
                    }}
                    maxFiles={MAX_FILES_PER_ITEM}
                    maxSize={MAX_FILE_SIZE_BYTES}
                    helperText="Ajoutez des photos/plan pour cet élément."
                    error={(itemErr?.files as any)?.message}
                  />
                </div>
              </div>

              {itemErr && (
                <p
                  id={`items.${index}-error`}
                  className="mt-2 text-xs text-red-600"
                >
                  Corrigez les erreurs surlignées ci‑dessus.
                </p>
              )}
            </motion.fieldset>
          );
        })}
      </AnimatePresence>

      {fields.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Aucun store ajouté. Utilisez “Ajouter” pour créer votre premier
          élément.
        </div>
      )}
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

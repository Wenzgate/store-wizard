// src/components/forms/StoreItemRepeater.tsx
"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import type { z } from "zod";
import { MIN_DIM_MM, QuoteRequestSchema } from "@/schemas/quote";



type FormValues = z.input<typeof QuoteRequestSchema>;

export default function StoreItemRepeater() {
  const { control } = useFormContext<FormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  return (
    <div className="space-y-4">
      {fields.map((f, i) => (
        <ItemCard key={f.id} index={i} onRemove={() => remove(i)} />
      ))}

      <button
        type="button"
        onClick={() =>
          append({
            id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
            type: "ROLLER",
            quantity: 1,
            mount: "INSIDE",
            control: "CHAIN",
            dims: { width: MIN_DIM_MM, height: MIN_DIM_MM },
            notes: "",
          } as any)
        }
        className="rounded-xl border border-brand bg-brand-alt px-4 py-2 text-sm text-brand-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand"
      >
        + Ajouter un store
      </button>
    </div>
  );
}

function ItemCard({ index, onRemove }: { index: number; onRemove: () => void }) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<FormValues>();
  const ctrl = watch(`items.${index}.control`);
  const room = watch(`items.${index}.room`);
  const itemErrors = errors.items?.[index];

  return (
    <article className="rounded-2xl border border-border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Store #{index + 1}</h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md border border-brand px-2 py-1 text-xs hover:bg-brand-alt focus:outline-none focus:ring-2 focus:ring-brand"
          >
            Supprimer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Type */}
        <div>
          <label className="mb-1 block text-sm font-medium">Type*</label>
          <select
            {...register(`items.${index}.type` as const)}
            className={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${itemErrors?.type ? "border-red-500" : "border-border"}`}
            aria-invalid={!!itemErrors?.type}
          >
            <option value="ROLLER">Enrouleur</option>
            <option value="VENETIAN">Vénitien</option>
            <option value="ROMAN">Bateau</option>
            <option value="PLEATED">Plissé</option>
            <option value="CASSETTE">Coffre / Box</option>
          </select>
          {itemErrors?.type?.message && (
            <p className="mt-1 text-xs text-red-500">
              {itemErrors.type.message as string}
            </p>
          )}
        </div>

        {/* Quantité */}
        <div>
          <label className="mb-1 block text-sm font-medium">Quantité*</label>
          <input
            type="number"
            min={1}
            {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
            className={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${itemErrors?.quantity ? "border-red-500" : "border-border"}`}
            aria-invalid={!!itemErrors?.quantity}
          />
          {itemErrors?.quantity?.message && (
            <p className="mt-1 text-xs text-red-500">
              {itemErrors.quantity.message as string}
            </p>
          )}
        </div>

        {/* Pose */}
        <div>
          <label className="mb-1 block text-sm font-medium">Pose*</label>
          <select
            {...register(`items.${index}.mount` as const)}
            className={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${itemErrors?.mount ? "border-red-500" : "border-border"}`}
            aria-invalid={!!itemErrors?.mount}
          >
            <option value="INSIDE">Intérieur</option>
            <option value="OUTSIDE">Extérieur</option>
          </select>
          {itemErrors?.mount?.message && (
            <p className="mt-1 text-xs text-red-500">
              {itemErrors.mount.message as string}
            </p>
          )}
        </div>

        {/* Ouverture */}
        <div>
          <label className="mb-1 block text-sm font-medium">Type d’ouverture*</label>
          <select
            {...register(`items.${index}.windowType` as const)}
            className={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${itemErrors?.windowType ? "border-red-500" : "border-border"}`}
            aria-invalid={!!itemErrors?.windowType}
          >
            <option value="">—</option>
            <option value="WINDOW_SINGLE">Fenêtre</option>
            <option value="WINDOW_DOOR">Porte-fenêtre</option>
            <option value="BAY">Baie</option>
            <option value="CORNER">Angle</option>
            <option value="SKYLIGHT">Vélux</option>
            <option value="OTHER">Autre</option>
          </select>
          {itemErrors?.windowType?.message && (
            <p className="mt-1 text-xs text-red-500">
              {itemErrors.windowType.message as string}
            </p>
          )}
        </div>

        {/* Pièce */}
        <div>
          <label className="mb-1 block text-sm font-medium">Pièce*</label>
          <select
            {...register(`items.${index}.room` as const)}
            className={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${itemErrors?.room ? "border-red-500" : "border-border"}`}
            aria-invalid={!!itemErrors?.room}
          >
            <option value="">—</option>
            <option value="LIVING">Salon</option>
            <option value="KITCHEN">Cuisine</option>
            <option value="BEDROOM">Chambre</option>
            <option value="BATHROOM">Salle de bain</option>
            <option value="OFFICE">Bureau</option>
            <option value="OTHER">Autre</option>
          </select>
          {itemErrors?.room?.message && (
            <p className="mt-1 text-xs text-red-500">
              {itemErrors.room.message as string}
            </p>
          )}
        </div>

        {/* Label Pièce si OTHER */}
        {room === "OTHER" && (
          <div>
            <label className="mb-1 block text-sm font-medium">Précision Pièce</label>
            <input
              type="text"
              {...register(`items.${index}.roomLabel` as const)}
              className={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${itemErrors?.roomLabel ? "border-red-500" : "border-border"}`}
              aria-invalid={!!itemErrors?.roomLabel}
            />
            {itemErrors?.roomLabel?.message && (
              <p className="mt-1 text-xs text-red-500">
                {itemErrors.roomLabel.message as string}
              </p>
            )}
          </div>
        )}

        {/* Commande */}
        <div>
          <label className="mb-1 block text-sm font-medium">Commande*</label>
          <select
            {...register(`items.${index}.control` as const)}
            className={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${itemErrors?.control ? "border-red-500" : "border-border"}`}
            aria-invalid={!!itemErrors?.control}
            onChange={(e) => {
              if (e.target.value !== "MOTOR") {
                // on vide le bloc motor si on n'est plus en motorisation
                setValue(`items.${index}.motor` as const, undefined as any, { shouldDirty: true });
              }
            }}
          >
            <option value="CHAIN">Chaînette</option>
            <option value="MOTOR">Motorisation</option>
          </select>
          {itemErrors?.control?.message && (
            <p className="mt-1 text-xs text-red-500">
              {itemErrors.control.message as string}
            </p>
          )}
        </div>

        {/* Motorisation (si MOTEUR) */}
        {ctrl === "MOTOR" && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">Alimentation moteur</label>
              <select
                {...register(`items.${index}.motor.power` as const)}
                className={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${itemErrors?.motor?.power ? "border-red-500" : "border-border"}`}
                aria-invalid={!!itemErrors?.motor?.power}
              >
                <option value="">—</option>
                <option value="WIRED">Filaire</option>
                <option value="BATTERY">Batterie</option>
                <option value="SOLAR">Solaire</option>
              </select>
              {itemErrors?.motor?.power?.message && (
                <p className="mt-1 text-xs text-red-500">
                  {itemErrors.motor.power.message as string}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Marque (optionnel)</label>
              <input
                type="text"
                {...register(`items.${index}.motor.brand` as const)}
                className={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${itemErrors?.motor?.brand ? "border-red-500" : "border-border"}`}
                aria-invalid={!!itemErrors?.motor?.brand}
              />
              {itemErrors?.motor?.brand?.message && (
                <p className="mt-1 text-xs text-red-500">
                  {itemErrors.motor.brand.message as string}
                </p>
              )}
            </div>
          </>
        )}

        {/* Dimensions */}
        <div>
          <label className="mb-1 block text-sm font-medium">Largeur (mm)*</label>
          <input
            type="number"
            min={200}
            max={5000}
            {...register(`items.${index}.dims.width` as const, { valueAsNumber: true })}
            className={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${itemErrors?.dims?.width ? "border-red-500" : "border-border"}`}
            aria-invalid={!!itemErrors?.dims?.width}
          />
          {itemErrors?.dims?.width?.message && (
            <p className="mt-1 text-xs text-red-500">
              {itemErrors.dims.width.message as string}
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Hauteur (mm)*</label>
          <input
            type="number"
            min={200}
            max={5000}
            {...register(`items.${index}.dims.height` as const, { valueAsNumber: true })}
            className={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${itemErrors?.dims?.height ? "border-red-500" : "border-border"}`}
            aria-invalid={!!itemErrors?.dims?.height}
          />
          {itemErrors?.dims?.height?.message && (
            <p className="mt-1 text-xs text-red-500">
              {itemErrors.dims.height.message as string}
            </p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="mt-3">
        <label className="mb-1 block text-sm font-medium">Notes (optionnel)</label>
        <textarea
          {...register(`items.${index}.notes` as const)}
          className={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm ${itemErrors?.notes ? "border-red-500" : "border-border"}`}
          rows={3}
          aria-invalid={!!itemErrors?.notes}
        />
        {itemErrors?.notes?.message && (
          <p className="mt-1 text-xs text-red-500">
            {itemErrors.notes.message as string}
          </p>
        )}
      </div>
    </article>
  );
}

// src/lib/labels.ts
import type { StoreItem } from "@/types/quote";

export function roomLabel(v: NonNullable<StoreItem["room"]>) {
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

export function windowLabel(v: NonNullable<StoreItem["windowType"]>) {
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

// idem tu peux y mettre typeLabel, controlLabel, windowLabel…

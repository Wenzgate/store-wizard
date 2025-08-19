/**
 * Contrats de données — LOT 2
 * Types stricts pour le parcours "Devis Stores".
 * Ces types sont la référence pour les schémas Zod miroirs.
 */

export type BudgetRange =
  | "LOW" // ~ entrée de gamme / budget serré
  | "MID" // ~ standard
  | "HIGH" // ~ premium
  | "LUX"; // ~ haut de gamme

export type Timing =
  | "ASAP" // aussi vite que possible
  | "W2_4" // dans 2 à 4 semaines
  | "FLEX" // flexible / pas d'urgence
  | "JUST_INFO"; // simple demande d'info

export type StoreType =
  | "VENETIAN" // vénitien
  | "ROMAN" // bateau
  | "ROLLER" // enrouleur
  | "PLEATED" // plissé
  | "CASSETTE"; // coffre/box

export type MountType =
  | "INSIDE" // pose dans l'embrasure (tableau)
  | "OUTSIDE" // pose murale en recouvrement
  | "CEILING"; // pose plafond

export type WindowType =
  | "WINDOW_SINGLE"
  | "WINDOW_DOOR"
  | "BAY"
  | "CORNER"
  | "SKYLIGHT"
  | "OTHER";

export type RoomType =
  | "LIVING"
  | "KITCHEN"
  | "BEDROOM"
  | "BATHROOM"
  | "OFFICE"
  | "OTHER";

export type Control =
  | "CHAIN" // chaînette
  | "MOTOR" // motorisation
  | "CRANK" // manivelle
  | "SPRING"; // ressort (auto‑blocant)

export type ControlSide = "LEFT" | "RIGHT";

export type MotorPower = "WIRED" | "BATTERY" | "SOLAR";

export type FabricOpacity = "SHEER" | "TRANSLUCENT" | "DIMOUT" | "BLACKOUT" | "SCREEN";

export interface Fabric {
  brand?: "BANDALUX" | "OTHER";
  collection?: string; // ex: Polyscreen, Premium, etc.
  colorName?: string; // ex: White, Grey 300, ...
  colorCode?: string; // ex: PS550, 300, 001
  opennessFactorPct?: number | null; // pour tissus screen (0–10+)
  opacity?: FabricOpacity;
  notes?: string;
}

export interface ColorPreference {
  tone?: "WHITE" | "NEUTRAL" | "WARM" | "COOL" | "DARK" | "CUSTOM";
  custom?: string | null; // description libre si CUSTOM
}

export interface FileRef {
  id: string; // uuid/ulid côté client
  name: string;
  mime: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  size: number; // bytes
  url?: string; // url temporaire (prévisualisation)
}

export interface DimensionsCm {
  width: number; // 20–500 cm
  height: number; // 20–500 cm
  toleranceCm?: number; // 0–5 cm (jeu accepté)
}

export interface StoreItem {
  id: string; // client‑side id
  type: StoreType;
  quantity: number; // >= 1
  room?: RoomType;
  roomLabel?: string | null; // si RoomType OTHER ou précision
  windowType?: WindowType;
  mount: MountType;
  control: Control;
  controlSide?: ControlSide; // si applicable (chaînette/manivelle)
  motor?: {
    brand?: string | null;
    power?: MotorPower;
    notes?: string | null;
  } | null;
  fabric?: Fabric | null;
  color?: ColorPreference | null;
  dims: DimensionsCm;
  notes?: string | null;
  files?: FileRef[]; // max 6 fichiers par demande (contrainte globale)
}

export type ContactPreference = "EMAIL" | "PHONE" | "WHATSAPP";

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  contactPref?: ContactPreference;
}

export interface Address {
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null; // "BE" par défaut côté UI
}

export interface ProjectInfo {
  budget?: BudgetRange | null;
  timing?: Timing | null;
  address?: Address | null;
  notes?: string | null;
}

export interface QuoteRequest {
  id?: string; // défini côté serveur plus tard
  createdAt?: string; // ISO
  items: StoreItem[]; // >= 1
  customer: CustomerInfo;
  project?: ProjectInfo | null;
  files?: FileRef[]; // uploads globaux (plans / photos génériques) max 6
  consentRgpd: boolean; // obligatoire
  acceptEstimateOnly?: boolean; // "estimation indicative" accepté
  source?: "WIDGET" | "WEBSITE" | "OTHER";
  locale?: "fr" | "en" | "nl";
  honeypot?: string | null; // champ anti‑bot (doit rester vide)
}

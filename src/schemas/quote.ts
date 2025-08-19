/**
 * Schémas Zod — LOT 2
 * Miroirs stricts des types TS avec validations métier.
 */
import { z } from "zod";
import type {
  BudgetRange,
  Timing,
  StoreType,
  MountType,
  WindowType,
  RoomType,
  Control,
  ControlSide,
  MotorPower,
  FabricOpacity,
  QuoteRequest,
  StoreItem,
  FileRef,
} from "@/types/quote";

// Helpers
const trim = (s: string) => s.trim();

// Bornes métiers
export const MIN_DIM_CM = 20;
export const MAX_DIM_CM = 500;
export const MIN_TOLERANCE_CM = 0;
export const MAX_TOLERANCE_CM = 5;
export const MAX_FILES = 6;
export const MAX_FILES_PER_ITEM = 6;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo

// --- Enums (z.enum) ---
// ⚠️ Ne pas caster vers ZodEnum<[...]> avec des types TS, ça casse Zod v4 classic.
// On garde les valeurs brutes ; les types TS restent séparés dans "@/types/quote".
export const BudgetRangeEnum = z.enum(["LOW", "MID", "HIGH", "LUX"]);
export const TimingEnum = z.enum(["ASAP", "W2_4", "FLEX", "JUST_INFO"]);
export const StoreTypeEnum = z.enum(["VENETIAN", "ROMAN", "ROLLER", "PLEATED", "CASSETTE"]);
export const MountTypeEnum = z.enum(["INSIDE", "OUTSIDE", "CEILING"]);
export const WindowTypeEnum = z.enum(["WINDOW_SINGLE", "WINDOW_DOOR", "BAY", "CORNER", "SKYLIGHT", "OTHER"]);
export const RoomTypeEnum = z.enum(["LIVING", "KITCHEN", "BEDROOM", "BATHROOM", "OFFICE", "OTHER"]);
export const ControlEnum = z.enum(["CHAIN", "MOTOR", "CRANK", "SPRING"]);
export const ControlSideEnum = z.enum(["LEFT", "RIGHT"]);
export const MotorPowerEnum = z.enum(["WIRED", "BATTERY", "SOLAR"]);
export const FabricOpacityEnum = z.enum(["SHEER", "TRANSLUCENT", "DIMOUT", "BLACKOUT", "SCREEN"]);

// Fichier
export const FileRefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).transform(trim),
  mime: z.union([
    z.literal("image/jpeg"),
    z.literal("image/png"),
    z.literal("image/webp"),
    z.literal("application/pdf"),
  ]),
  size: z.number().int().nonnegative().max(MAX_FILE_SIZE_BYTES),
  url: z.string().url().optional(),
});
// (on ne force pas avec `satisfies z.ZodType<FileRef>` pour éviter des incompatibilités internes)

// Tissu & couleur
export const FabricSchema = z.object({
  brand: z.union([z.literal("BANDALUX"), z.literal("OTHER")]).optional(),
  collection: z.string().trim().optional(),
  colorName: z.string().trim().optional(),
  colorCode: z.string().trim().optional(),
  opennessFactorPct: z.number().min(0).max(100).nullable().optional(),
  opacity: FabricOpacityEnum.optional(),
  notes: z.string().trim().optional(),
});

export const ColorPreferenceSchema = z.object({
  tone: z
    .union([
      z.literal("WHITE"),
      z.literal("NEUTRAL"),
      z.literal("WARM"),
      z.literal("COOL"),
      z.literal("DARK"),
      z.literal("CUSTOM"),
    ])
    .optional(),
  custom: z.string().trim().nullable().optional(),
});

// Dimensions
export const DimensionsSchema = z.object({
  width: z.number().min(MIN_DIM_CM).max(MAX_DIM_CM),
  height: z.number().min(MIN_DIM_CM).max(MAX_DIM_CM),
  toleranceCm: z.number().min(MIN_TOLERANCE_CM).max(MAX_TOLERANCE_CM).optional(),
});

// Item
export const StoreItemSchema = z.object({
  id: z.string().min(1),
  type: StoreTypeEnum,
  quantity: z.number().int().min(1).max(50),
  room: RoomTypeEnum.optional(),
  roomLabel: z.string().trim().nullable().optional(),
  windowType: WindowTypeEnum.optional(),
  mount: MountTypeEnum,
  control: ControlEnum,
  controlSide: ControlSideEnum.optional(),
  motor: z
    .object({
      brand: z.string().trim().nullable().optional(),
      power: MotorPowerEnum.optional(),
      notes: z.string().trim().nullable().optional(),
    })
    .nullable()
    .optional(),
  fabric: FabricSchema.nullable().optional(),
  color: ColorPreferenceSchema.nullable().optional(),
  dims: DimensionsSchema,
  notes: z.string().trim().nullable().optional(),
  files: z.array(FileRefSchema).max(MAX_FILES_PER_ITEM).optional(),
});
// (on évite `satisfies z.ZodType<StoreItem>` qui rigidifie trop les internes de Zod v4)

// Contact
export const ContactPreferenceEnum = z.enum(["EMAIL", "PHONE", "WHATSAPP"]);
export const CustomerInfoSchema = z.object({
  firstName: z.string().min(1).transform(trim),
  lastName: z.string().min(1).transform(trim),
  email: z.string().email().transform(trim),
  phone: z
    .string()
    .trim()
    .min(6)
    .max(20)
    .regex(/^(\+?\d{6,15}|0\d{8,12})$/, "Numéro de téléphone invalide")
    .nullable()
    .optional(),
  contactPref: ContactPreferenceEnum.optional(),
});

// Adresse & projet
export const AddressSchema = z.object({
  street: z.string().trim().nullable().optional(),
  postalCode: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  country: z.string().trim().nullable().optional(),
});

export const ProjectInfoSchema = z.object({
  budget: BudgetRangeEnum.nullable().optional(),
  timing: TimingEnum.nullable().optional(),
  address: AddressSchema.nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

// QuoteRequest
export const QuoteRequestSchema = z
  .object({
    id: z.string().optional(),
    createdAt: z.string().datetime().optional(),
    items: z.array(StoreItemSchema).min(1).max(50),
    customer: CustomerInfoSchema,
    project: ProjectInfoSchema.nullable().optional(),
    files: z.array(FileRefSchema).max(MAX_FILES).optional(),
    // Zod v4 "classic": on utilise { message } et pas { errorMap }
    consentRgpd: z.literal(true, { message: "Le consentement RGPD est requis." }),
    acceptEstimateOnly: z.boolean().optional(),
    source: z.union([z.literal("WIDGET"), z.literal("WEBSITE"), z.literal("OTHER")]).optional(),
    locale: z.union([z.literal("fr"), z.literal("en"), z.literal("nl")]).optional(),
    honeypot: z.string().max(0).nullable().optional(), // doit rester vide
  })
  .superRefine((data, ctx) => {
    // Vérifier que la somme des quantités > 0 (sécurité)
    const totalQty = (data.items ?? []).reduce((acc, it) => acc + (it.quantity || 0), 0);
    if (totalQty <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La quantité totale doit être supérieure à 0.",
        path: ["items"],
      });
    }

    // Si control = CHAIN ou CRANK → controlSide requis
    data.items.forEach((it, idx) => {
      if ((it.control === "CHAIN" || it.control === "CRANK") && !it.controlSide) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le côté de manoeuvre est requis pour ce type de commande.",
          path: ["items", idx, "controlSide"],
        });
      }
      // Si control = MOTOR → préciser motor.power
      if (it.control === "MOTOR" && !it.motor?.power) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le type d'alimentation moteur est requis.",
          path: ["items", idx, "motor", "power"],
        });
      }
    });
  });

// Parse helpers
export function parseQuoteRequest(input: unknown): QuoteRequest {
  // TS accepte structurellement si QuoteRequest ~ z.infer<typeof QuoteRequestSchema>
  return QuoteRequestSchema.parse(input) as QuoteRequest;
}
export function safeParseQuoteRequest(input: unknown) {
  return QuoteRequestSchema.safeParse(input);
}

export {
  FileRefSchema as ZFileRef,
  FabricSchema as ZFabric,
  ColorPreferenceSchema as ZColorPreference,
  DimensionsSchema as ZDimensions,
  StoreItemSchema as ZStoreItem,
  CustomerInfoSchema as ZCustomerInfo,
  AddressSchema as ZAddress,
  ProjectInfoSchema as ZProjectInfo,
};

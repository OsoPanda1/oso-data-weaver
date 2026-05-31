import { z } from "zod";
import type { HeHepContext } from "../../../lib/contracts/elite-hehep";

export const RDM_TOS_VERSION = "0.1.0";
export const RDM_TOS_REPOSITORY = "oso-data-weaver";
export const RDM_TOS_SOURCE = "rdm-tos:kernel";

export const RDM_IDENTITY_CONTEXT: HeHepContext = {
  hexagon: "HE-Identity",
  domain: "HEP-1",
};

export const RDM_ECONOMY_CONTEXT: HeHepContext = {
  hexagon: "HE-Economy",
  domain: "HEP-1",
};

export const RDM_INGEST_CONTEXT: HeHepContext = {
  hexagon: "HE-Ingest",
  domain: "HEP-1",
};

export const RDM_TRANSFORM_CONTEXT: HeHepContext = {
  hexagon: "HE-Transform",
  domain: "HEP-1",
};

export type TerritorialRole = "citizen" | "commerce" | "operator" | "guardian";
export type TransactionType = "reward" | "payment" | "adjustment";
export type PaymentProvider = "stripe" | "simulated";
export type PaymentStatus = "requires_confirmation" | "succeeded" | "failed" | "simulated";

export interface TerritorialUser {
  id: string;
  email: string;
  role: TerritorialRole;
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  createdAt: string;
  reason?: string;
}

export interface Place {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
}

export interface Commerce {
  id: string;
  name: string;
  category: string;
  createdAt: string;
}

export interface PaymentIntentRecord {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  clientSecret?: string;
  createdAt: string;
}

export interface AuditTrailEntry {
  id: string;
  eventType: string;
  he_hep_context: HeHepContext;
  integrity: string;
  createdAt: string;
}

export interface SotProjection {
  users: TerritorialUser[];
  wallets: Wallet[];
  transactions: Transaction[];
  places: Place[];
  commerce: Commerce[];
  payments: PaymentIntentRecord[];
  auditTrail: AuditTrailEntry[];
}

export type SotCommand =
  | { type: "RegisterCitizen"; email: string; role?: TerritorialRole }
  | { type: "RewardWallet"; userId: string; amount: number; reason?: string }
  | { type: "CreateCommerce"; name: string; category: string }
  | { type: "CreatePaymentIntent"; amount: number; currency?: string; provider?: PaymentProvider }
  | { type: "AskTerritorialAI"; message: string };

export type SotEvent =
  | { type: "CitizenRegistered"; user: TerritorialUser; wallet: Wallet }
  | { type: "WalletRewarded"; wallet: Wallet; transaction: Transaction }
  | { type: "CommerceCreated"; commerce: Commerce }
  | { type: "PaymentIntentCreated"; payment: PaymentIntentRecord }
  | {
      type: "PaymentWebhookReceived";
      provider: PaymentProvider;
      status: PaymentStatus;
      externalId?: string;
    }
  | { type: "TerritorialAIAnswered"; message: string; response: string; placeIds: string[] };

export const RegisterCitizenSchema = z
  .object({
    email: z.string().email().max(320),
    role: z.enum(["citizen", "commerce", "operator", "guardian"]).default("citizen"),
  })
  .strict();

export const RewardWalletSchema = z
  .object({
    userId: z.string().min(1).max(128),
    amount: z.number().positive().max(100_000),
    reason: z.string().min(1).max(240).optional(),
  })
  .strict();

export const CreateCommerceSchema = z
  .object({
    name: z.string().min(2).max(160),
    category: z.string().min(2).max(80),
  })
  .strict();

export const AskTerritorialAISchema = z
  .object({
    message: z.string().min(1).max(2_000),
  })
  .strict();

export const CreatePaymentIntentSchema = z
  .object({
    amount: z.number().positive().max(1_000_000),
    currency: z
      .string()
      .regex(/^[a-z]{3}$/)
      .default("mxn"),
    provider: z.enum(["stripe", "simulated"]).default("stripe"),
  })
  .strict();

export const StripeWebhookSchema = z
  .object({
    type: z.string().min(1).max(160),
    data: z
      .object({
        object: z
          .object({
            id: z.string().optional(),
            status: z.string().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

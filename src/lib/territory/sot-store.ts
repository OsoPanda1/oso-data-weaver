import { randomUUID, timingSafeEqual, createHmac } from "node:crypto";

import { emitEliteBookPiEvent } from "../../../lib/contracts/bookpi-emitter";
import type { HeHepContext } from "../../../lib/contracts/elite-hehep";
import {
  RDM_ECONOMY_CONTEXT,
  RDM_IDENTITY_CONTEXT,
  RDM_INGEST_CONTEXT,
  RDM_TOS_REPOSITORY,
  RDM_TOS_SOURCE,
  RDM_TOS_VERSION,
  RDM_TRANSFORM_CONTEXT,
  type AuditTrailEntry,
  type Commerce,
  type PaymentIntentRecord,
  type PaymentProvider,
  type PaymentStatus,
  type Place,
  type SotEvent,
  type SotProjection,
  type TerritorialRole,
  type TerritorialUser,
  type Transaction,
  type Wallet,
} from "./sot-contracts";

interface MutableSotState extends SotProjection {
  eventLog: SotEvent[];
}

declare global {
  var __rdmSotState: MutableSotState | undefined;
}

const seedPlaces: Place[] = [
  {
    id: "rdm-place-centro",
    name: "Centro histórico de Real del Monte",
    type: "heritage",
    lat: 20.1384,
    lng: -98.6733,
  },
  {
    id: "rdm-place-mina-acosta",
    name: "Mina de Acosta",
    type: "museum",
    lat: 20.1448,
    lng: -98.6718,
  },
  {
    id: "rdm-place-panteon-ingles",
    name: "Panteón Inglés",
    type: "heritage",
    lat: 20.1451,
    lng: -98.6802,
  },
  {
    id: "rdm-place-pastes",
    name: "Corredor gastronómico de pastes",
    type: "commerce",
    lat: 20.138,
    lng: -98.6728,
  },
  {
    id: "rdm-place-mirador",
    name: "Mirador territorial RDM",
    type: "viewpoint",
    lat: 20.1369,
    lng: -98.6681,
  },
];

function state(): MutableSotState {
  globalThis.__rdmSotState ??= {
    users: [],
    wallets: [],
    transactions: [],
    places: seedPlaces,
    commerce: [],
    payments: [],
    auditTrail: [],
    eventLog: [],
  };
  return globalThis.__rdmSotState;
}

function now(): string {
  return new Date().toISOString();
}

function appendEvent(event: SotEvent): void {
  state().eventLog.push(event);
}

async function audit<TPayload>(
  type: string,
  payload: TPayload,
  context: HeHepContext,
): Promise<AuditTrailEntry> {
  const emitted = await emitEliteBookPiEvent({
    protocol: `rdm-tos/${RDM_TOS_VERSION}`,
    type,
    source: RDM_TOS_SOURCE,
    repository: RDM_TOS_REPOSITORY,
    payload,
    context,
    meta: {
      doctrine: "MD-X4",
      audit: "BookPI-compatible local envelope",
      consent: "operator-mediated",
    },
  });

  const entry: AuditTrailEntry = {
    id: emitted.header.id,
    eventType: emitted.header.type,
    he_hep_context: emitted.header.he_hep_context,
    integrity: emitted.integrity.sha256,
    createdAt: emitted.header.createdAt,
  };
  state().auditTrail.unshift(entry);
  return entry;
}

export function getSotProjection(): SotProjection {
  const current = state();
  return {
    users: [...current.users],
    wallets: [...current.wallets],
    transactions: [...current.transactions],
    places: [...current.places],
    commerce: [...current.commerce],
    payments: [...current.payments],
    auditTrail: [...current.auditTrail],
  };
}

export async function registerCitizen(input: { email: string; role?: TerritorialRole }) {
  const current = state();
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = current.users.find((user) => user.email === normalizedEmail);
  if (existing) {
    const wallet = current.wallets.find((item) => item.userId === existing.id);
    return { user: existing, wallet, created: false };
  }

  const createdAt = now();
  const user: TerritorialUser = {
    id: randomUUID(),
    email: normalizedEmail,
    role: input.role ?? "citizen",
    createdAt,
  };
  const wallet: Wallet = {
    id: randomUUID(),
    userId: user.id,
    balance: 0,
    updatedAt: createdAt,
  };

  current.users.push(user);
  current.wallets.push(wallet);
  const event: SotEvent = { type: "CitizenRegistered", user, wallet };
  appendEvent(event);
  const auditTrail = await audit(event.type, event, RDM_IDENTITY_CONTEXT);
  return { user, wallet, created: true, auditTrail };
}

export async function rewardWallet(input: { userId: string; amount: number; reason?: string }) {
  const current = state();
  const wallet = current.wallets.find((item) => item.userId === input.userId);
  if (!wallet) throw new Error("wallet_not_found");

  wallet.balance = Number((wallet.balance + input.amount).toFixed(2));
  wallet.updatedAt = now();
  const transaction: Transaction = {
    id: randomUUID(),
    userId: input.userId,
    amount: input.amount,
    type: "reward",
    reason: input.reason,
    createdAt: wallet.updatedAt,
  };
  current.transactions.unshift(transaction);
  const event: SotEvent = { type: "WalletRewarded", wallet: { ...wallet }, transaction };
  appendEvent(event);
  const auditTrail = await audit(event.type, event, RDM_ECONOMY_CONTEXT);
  return { success: true, wallet: { ...wallet }, transaction, auditTrail };
}

export async function createCommerce(input: { name: string; category: string }) {
  const current = state();
  const commerce: Commerce = {
    id: randomUUID(),
    name: input.name.trim(),
    category: input.category.trim().toLowerCase(),
    createdAt: now(),
  };
  current.commerce.unshift(commerce);
  const event: SotEvent = { type: "CommerceCreated", commerce };
  appendEvent(event);
  const auditTrail = await audit(event.type, event, RDM_INGEST_CONTEXT);
  return { commerce, auditTrail };
}

export async function askTerritorialAI(input: { message: string }) {
  const current = state();
  const relevantPlaces = current.places.slice(0, 5);
  const commerce = current.commerce.slice(0, 3);
  const response = [
    `Consulta: ${input.message.trim()}`,
    `Lugares priorizados: ${relevantPlaces.map((place) => place.name).join(", ")}.`,
    commerce.length > 0
      ? `Comercios conectados: ${commerce.map((item) => item.name).join(", ")}.`
      : "Comercios conectados: pendiente de alta territorial.",
    "Guardianes activos: privacidad, consentimiento informado, no extracción y audit trail BookPI.",
  ].join("\n");

  const event: SotEvent = {
    type: "TerritorialAIAnswered",
    message: input.message,
    response,
    placeIds: relevantPlaces.map((place) => place.id),
  };
  appendEvent(event);
  const auditTrail = await audit(event.type, event, RDM_TRANSFORM_CONTEXT);
  return { response, places: relevantPlaces, auditTrail };
}

async function createStripeIntent(amount: number, currency: string) {
  const secret = process.env.STRIPE_SECRET;
  if (!secret) return null;

  const body = new URLSearchParams({
    amount: String(Math.round(amount * 100)),
    currency,
  });
  const response = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`stripe_payment_intent_failed:${response.status}:${detail.slice(0, 240)}`);
  }

  return (await response.json()) as { id: string; client_secret?: string; status?: string };
}

export async function createPaymentIntent(input: {
  amount: number;
  currency?: string;
  provider?: PaymentProvider;
}) {
  const current = state();
  const currency = input.currency ?? "mxn";
  const requestedProvider = input.provider ?? "stripe";
  const stripeIntent =
    requestedProvider === "stripe" ? await createStripeIntent(input.amount, currency) : null;
  const provider: PaymentProvider = stripeIntent ? "stripe" : "simulated";
  const status: PaymentStatus = stripeIntent ? "requires_confirmation" : "simulated";
  const payment: PaymentIntentRecord = {
    id: stripeIntent?.id ?? `pi_sim_${randomUUID()}`,
    amount: input.amount,
    currency,
    status,
    provider,
    clientSecret: stripeIntent?.client_secret ?? `simulated_secret_${randomUUID()}`,
    createdAt: now(),
  };
  current.payments.unshift(payment);
  const event: SotEvent = { type: "PaymentIntentCreated", payment };
  appendEvent(event);
  const auditTrail = await audit(event.type, event, RDM_ECONOMY_CONTEXT);
  return { payment, clientSecret: payment.clientSecret, mode: provider, auditTrail };
}

export function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  secret = process.env.STRIPE_WEBHOOK_SECRET,
): boolean {
  if (!secret || !signatureHeader) return false;
  const timestamp = signatureHeader
    .split(",")
    .find((part) => part.startsWith("t="))
    ?.slice(2);
  const signature = signatureHeader
    .split(",")
    .find((part) => part.startsWith("v1="))
    ?.slice(3);
  if (!timestamp || !signature) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(signature, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function acknowledgePaymentWebhook(input: {
  provider: PaymentProvider;
  status: PaymentStatus;
  externalId?: string;
  signatureVerified: boolean;
}) {
  const current = state();
  if (input.externalId) {
    const payment = current.payments.find((item) => item.id === input.externalId);
    if (payment) payment.status = input.status;
  }
  const event: SotEvent = {
    type: "PaymentWebhookReceived",
    provider: input.provider,
    status: input.status,
    externalId: input.externalId,
  };
  appendEvent(event);
  const auditTrail = await audit(
    event.type,
    { ...event, signatureVerified: input.signatureVerified },
    RDM_ECONOMY_CONTEXT,
  );
  return { ok: true, signatureVerified: input.signatureVerified, auditTrail };
}

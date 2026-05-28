import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface GithubWebhookRecord {
  id: string;
  event: string;
  action?: string;
  repository?: {
    name?: string;
    full_name?: string;
    html_url?: string;
    language?: string | null;
    archived?: boolean;
    pushed_at?: string;
    updated_at?: string;
  };
  sender?: string;
  receivedAt: string;
  delivery?: string | null;
}

const WEBHOOK_DIR = ".tamv/github-webhooks";
const EVENTS_FILE = "events.json";

async function ensureDir() {
  await mkdir(WEBHOOK_DIR, { recursive: true });
}

export function verifyGithubWebhookSignature(rawBody: string, signature: string | null, secret?: string): boolean {
  if (!secret) return false;
  if (!signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function listGithubWebhookEvents(): Promise<GithubWebhookRecord[]> {
  try {
    return JSON.parse(await readFile(join(WEBHOOK_DIR, EVENTS_FILE), "utf8"));
  } catch (error: any) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export async function appendGithubWebhookEvent(record: GithubWebhookRecord) {
  await ensureDir();
  const events = await listGithubWebhookEvents();
  const next = [record, ...events].slice(0, 250);
  await writeFile(join(WEBHOOK_DIR, EVENTS_FILE), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return record;
}

export function normalizeGithubWebhook(event: string, delivery: string | null, payload: any): GithubWebhookRecord {
  return {
    id: delivery ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    event,
    action: payload?.action,
    repository: payload?.repository
      ? {
          name: payload.repository.name,
          full_name: payload.repository.full_name,
          html_url: payload.repository.html_url,
          language: payload.repository.language ?? null,
          archived: Boolean(payload.repository.archived),
          pushed_at: payload.repository.pushed_at,
          updated_at: payload.repository.updated_at,
        }
      : undefined,
    sender: payload?.sender?.login,
    receivedAt: new Date().toISOString(),
    delivery,
  };
}

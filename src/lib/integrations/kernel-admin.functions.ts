import { createServerFn } from "@tanstack/react-start";

import { validateOpenScienceIntegrations } from "./open-science";
import { diffManifestSnapshots, listManifestSnapshots, readManifestSnapshot } from "./manifest-snapshots";
import { listGithubWebhookEvents } from "./github-webhook-store";

export const validateOpenScienceStatus = createServerFn({ method: "GET" }).handler(async () => {
  return validateOpenScienceIntegrations();
});

export const getManifestSnapshotHistory = createServerFn({ method: "GET" }).handler(async () => {
  return listManifestSnapshots();
});

export const compareManifestSnapshots = createServerFn({ method: "GET" })
  .validator((input: unknown) => input as { before: string; after: string })
  .handler(async ({ data }) => {
    const before = await readManifestSnapshot(data.before);
    const after = await readManifestSnapshot(data.after);
    return diffManifestSnapshots(before, after);
  });

export const getGithubWebhookStatus = createServerFn({ method: "GET" }).handler(async () => {
  const events = await listGithubWebhookEvents();
  return {
    configured: Boolean(process.env.GITHUB_WEBHOOK_SECRET),
    eventCount: events.length,
    latest: events[0] ?? null,
    repositories: [...new Set(events.map((event) => event.repository?.full_name).filter(Boolean))],
  };
});

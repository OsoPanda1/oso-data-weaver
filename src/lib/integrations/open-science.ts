export type IntegrationKey = "orcid" | "zenodo" | "figshare";

export interface IntegrationValidationResult {
  key: IntegrationKey;
  label: string;
  ok: boolean;
  configured: boolean;
  latencyMs: number;
  checkedAt: string;
  error?: string;
  endpoint: string;
  secretExposed: false;
}

function sanitizeError(error: unknown): string {
  if (error instanceof Error) return error.message.replace(/[A-Za-z0-9_\-]{24,}/g, "[redacted]");
  return String(error).replace(/[A-Za-z0-9_\-]{24,}/g, "[redacted]");
}

async function measure(key: IntegrationKey, label: string, endpoint: string, configured: boolean, fn: () => Promise<Response>): Promise<IntegrationValidationResult> {
  const started = Date.now();
  if (!configured) {
    return { key, label, ok: false, configured: false, latencyMs: 0, checkedAt: new Date().toISOString(), error: "missing_configuration", endpoint, secretExposed: false };
  }
  try {
    const response = await fn();
    return {
      key,
      label,
      ok: response.ok,
      configured: true,
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
      error: response.ok ? undefined : `http_${response.status}`,
      endpoint,
      secretExposed: false,
    };
  } catch (error) {
    return {
      key,
      label,
      ok: false,
      configured: true,
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
      error: sanitizeError(error),
      endpoint,
      secretExposed: false,
    };
  }
}

export async function validateOrcid(): Promise<IntegrationValidationResult> {
  const orcidId = process.env.ORCID_ID;
  const configured = Boolean(orcidId || process.env.ORCID_CLIENT_ID || process.env.ORCID_API_KEY);
  const endpoint = orcidId ? `https://pub.orcid.org/v3.0/${encodeURIComponent(orcidId)}/record` : "https://pub.orcid.org/v3.0/expanded-search/?q=*&rows=0";
  return measure("orcid", "ORCID", endpoint, configured, () =>
    fetch(endpoint, { headers: { Accept: "application/json", "User-Agent": "tamv-core-kernel" } }),
  );
}

export async function validateZenodo(): Promise<IntegrationValidationResult> {
  const token = process.env.ZENODO_ACCESS_TOKEN ?? process.env.ZENODO_API_KEY;
  const endpoint = "https://zenodo.org/api/deposit/depositions?size=1";
  return measure("zenodo", "Zenodo", endpoint, Boolean(token), () =>
    fetch(endpoint, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }),
  );
}

export async function validateFigshare(): Promise<IntegrationValidationResult> {
  const token = process.env.FIGSHARE_TOKEN;
  const endpoint = "https://api.figshare.com/v2/account";
  return measure("figshare", "Figshare", endpoint, Boolean(token), () =>
    fetch(endpoint, { headers: { Authorization: `token ${token}`, Accept: "application/json" } }),
  );
}

export async function validateOpenScienceIntegrations() {
  const results = await Promise.all([validateOrcid(), validateZenodo(), validateFigshare()]);
  return {
    checkedAt: new Date().toISOString(),
    secretsExposed: false,
    results,
    summary: {
      configured: results.filter((item) => item.configured).length,
      ok: results.filter((item) => item.ok).length,
      failing: results.filter((item) => item.configured && !item.ok).length,
      missing: results.filter((item) => !item.configured).length,
      maxLatencyMs: Math.max(0, ...results.map((item) => item.latencyMs)),
    },
  };
}

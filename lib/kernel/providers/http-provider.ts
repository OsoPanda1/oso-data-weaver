import { sha256 } from "../../contracts/bookpi-emitter";
import type {
  TAMVAcademicProvider,
  TAMVArtifact,
  TAMVProviderCapabilities,
  TAMVProviderReference,
} from "../registry";

export interface HttpAcademicProviderConfig {
  name: "zenodo" | "figshare" | string;
  baseUrl: string;
  token?: string;
  authScheme: "bearer" | "token";
  createPath: string;
  readPath: (id: string) => string;
  requiredEnv?: string[];
  mapUploadBody: (artifact: TAMVArtifact) => unknown;
  mapUploadResponse: (raw: unknown) => TAMVProviderReference;
  mapReadResponse?: (raw: unknown) => TAMVProviderReference;
}

export class HttpAcademicProvider implements TAMVAcademicProvider {
  readonly name: string;

  constructor(private readonly config: HttpAcademicProviderConfig) {
    this.name = config.name;
  }

  async upload(artifact: TAMVArtifact): Promise<TAMVProviderReference> {
    this.assertConfigured();
    const response = await fetch(new URL(this.config.createPath, this.config.baseUrl), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.config.mapUploadBody(artifact)),
    });
    if (!response.ok) throw new Error(`${this.name} upload failed: HTTP ${response.status}`);
    const raw = await response.json();
    return { ...this.config.mapUploadResponse(raw), raw };
  }

  async readRemote(reference: TAMVProviderReference): Promise<TAMVProviderReference | null> {
    this.assertConfigured();
    const response = await fetch(new URL(this.config.readPath(reference.id), this.config.baseUrl), {
      headers: this.headers(),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`${this.name} read failed: HTTP ${response.status}`);
    const raw = await response.json();
    const mapper = this.config.mapReadResponse ?? this.config.mapUploadResponse;
    return { ...mapper(raw), raw };
  }

  async describeCapabilities(): Promise<TAMVProviderCapabilities> {
    const descriptor = {
      name: this.name,
      version: "tamv-http-provider/v1",
      endpoints: {
        create: new URL(this.config.createPath, this.config.baseUrl).toString(),
        read: new URL(this.config.readPath(":id"), this.config.baseUrl).toString(),
      },
      required_env: this.config.requiredEnv ?? [],
    };
    return {
      ...descriptor,
      schema_hash: sha256(descriptor),
      observed_at: new Date().toISOString(),
    };
  }

  private assertConfigured() {
    if (!this.config.token) throw new Error(`${this.name} provider is not configured.`);
  }

  private headers(): HeadersInit {
    const auth =
      this.config.authScheme === "bearer"
        ? `Bearer ${this.config.token}`
        : `token ${this.config.token}`;
    return {
      Authorization: auth,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "tamv-core-kernel",
    };
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

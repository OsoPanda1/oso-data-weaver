/**
 * TAMV Identity & Authentication Types
 * Cross-domain identity (GitHub, ORCID, Zenodo, Figshare)
 */

export interface TamvIdentity {
  userId: string; // UUID internal TAMV
  email: string;
  displayName: string;
  avatar?: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface OrcidLink {
  orcid: string; // e.g., "0000-0001-2345-6789"
  name: string;
  linkedAt: string;
  accessToken: string; // never exposed to UI
  accessTokenExpiresAt: string;
  refreshToken?: string;
  scopes: string[]; // e.g., ["/authenticate", "/read-public"]
}

export interface GitHubLink {
  username: string;
  userId: number;
  linkedAt: string;
  accessToken: string; // never exposed to UI
  scopes: string[];
}

export interface ZenodoLink {
  accessToken: string; // never exposed to UI
  linkedAt: string;
  scopes: string[]; // e.g., ["deposit:write", "deposit:actions"]
  tokenExpiresAt?: string;
}

export interface FigshareLink {
  token: string; // Personal token, never exposed to UI
  linkedAt: string;
  consumerId?: string;
  consumerSecret?: string; // never exposed to UI
}

/**
 * Full TAMV user profile with all integrations
 */
export interface TamvUserProfile {
  identity: TamvIdentity;
  orcid?: OrcidLink;
  github?: GitHubLink;
  zenodo?: ZenodoLink;
  figshare?: FigshareLink;
}

/**
 * OAuth state for security
 */
export interface OAuthState {
  state: string; // random CSRF token
  provider: 'orcid' | 'zenodo' | 'figshare';
  timestamp: number;
  nonce?: string;
}

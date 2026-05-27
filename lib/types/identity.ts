/**
 * TAMV Identity & Authentication Engine - V.2.0
 * Arquitectura de Integridad y Soberanía de Datos
 */

// --- Tipos Base ---

export type IdentityProvider = 'orcid' | 'github' | 'zenodo' | 'figshare';

export type IdentityStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

/**
 * Envoltorio de seguridad: Todo secreto debe estar cifrado en reposo.
 * Se prohíbe el uso de strings planos para tokens en el almacenamiento.
 */
export interface VaultedSecret {
  encryptedValue: string; // Token cifrado (AES-256)
  kid: string;           // Key ID para rotación
  lastRotated: string;   // ISO 8601
}

export interface TamvIdentity {
  userId: string;
  email: string;
  displayName: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Integraciones Evolucionadas ---

export interface BaseLink {
  provider: IdentityProvider;
  status: IdentityStatus;
  linkedAt: string;
  lastVerified: string;
  secret: VaultedSecret; // Protección garantizada
}

export interface OrcidLink extends BaseLink {
  orcid: string;
  scopes: string[];
}

export interface GitHubLink extends BaseLink {
  username: string;
  githubId: number;
  scopes: string[];
}

export interface ZenodoLink extends BaseLink {
  scopes: string[];
  expiresAt: string;
}

export interface FigshareLink extends BaseLink {
  consumerId: string;
}

/**
 * TamvUserProfile: Grafo de Identidad Soberana.
 * Estructura indexada para evitar dependencias lineales.
 */
export interface TamvUserProfile {
  identity: TamvIdentity;
  integrations: {
    [key in IdentityProvider]?: BaseLink;
  };
  auditTrail: {
    trustScore: number;
    lastAccess: string;
  };
}

// --- Interfaz de Visualización Pública ---

/**
 * PublicUserView: La única interfaz que debe tocar el cliente.
 * Filtra automáticamente todos los 'VaultedSecret' y datos sensibles.
 */
export type PublicUserView = Omit<TamvUserProfile, 'integrations'> & {
  integrations: Array<{
    provider: IdentityProvider;
    status: IdentityStatus;
    linkedAt: string;
  }>;
};

// --- Estado de Transacción OAuth (Máquina de estados) ---

export interface OAuthTransaction {
  id: string; 
  status: 'PENDING' | 'EXCHANGED' | 'VERIFIED' | 'FAILED';
  provider: IdentityProvider;
  nonce: string;
  context: Record<string, unknown>;
}

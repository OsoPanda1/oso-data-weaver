/**
 * CQRS Command Types
 * Commands represent user intents, validated and immutable
 */

export interface Command {
  commandId: string; // UUID v4
  type: string; // e.g., 'LinkOrcidCommand'
  aggregateId?: string; // entity being modified
  userId: string;
  timestamp: string; // ISO 8601
  data: Record<string, unknown>;
  correlationId?: string; // trace ID
}

// Identity commands
export interface LinkOrcidCommand extends Command {
  type: 'LinkOrcidCommand';
  data: {
    orcid: string;
    authorizationCode: string; // from OAuth callback
  };
}

export interface LinkZenodoCommand extends Command {
  type: 'LinkZenodoCommand';
  data: {
    authorizationCode: string;
  };
}

export interface LinkFigshareCommand extends Command {
  type: 'LinkFigshareCommand';
  data: {
    token: string;
  };
}

// Artifact commands
export interface CreateArtifactCommand extends Command {
  type: 'CreateArtifactCommand';
  data: {
    title: string;
    description: string;
    type: 'CODE' | 'DATASET' | 'PAPER' | 'SPEC' | 'MIXED';
    keywords?: string[];
  };
}

export interface PublishArtifactCommand extends Command {
  type: 'PublishArtifactCommand';
  data: {
    artifactId: string;
    targets: ('zenodo' | 'figshare')[]; // where to publish
    githubCommitHash?: string;
  };
}

export interface ArchiveArtifactCommand extends Command {
  type: 'ArchiveArtifactCommand';
  data: {
    artifactId: string;
  };
}

/**
 * Command result after execution
 */
export interface CommandResult<T = unknown> {
  commandId: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

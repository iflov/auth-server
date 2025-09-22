// =====================
// Base Types
// =====================
export type TokenStatus = 'active' | 'revoked' | 'expired';
export type ExecutionStatus = 'success' | 'failure' | 'in_progress';
export type WhitelistType = 'package' | 'domain';

// =====================
// Authorization Codes
// =====================
export interface CreateAuthorizationCodeInput {
  code: string;
  userId: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
  state?: string | null;
  codeChallenge: string; // Required for PKCE
  codeChallengeMethod?: string | null;
  expiresAt?: Date;
}

export interface AuthorizationCodeRecord {
  code: string; // Primary key
  userId: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string | null;
  codeChallenge: string;
  codeChallengeMethod: string | null;
  createdAt: Date;
  expiresAt: Date;
}

// =====================
// Refresh Tokens
// =====================
export interface CreateRefreshTokenInput {
  refreshToken: string;
  userId: string;
  clientId: string;
  scope?: string;
  family?: string | null;
  status?: TokenStatus;
  expiresAt?: Date;
}

export interface RefreshTokenRecord {
  refreshToken: string; // Primary key
  userId: string;
  clientId: string;
  scope: string;
  revoked: boolean;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
}

// =====================
// Access Tokens
// =====================
export interface SaveAccessTokenInput {
  tokenHash: string;
  userId: string;
  clientId: string;
  scope?: string;
  expiresAt?: Date;
  jti?: string | null;
  status?: TokenStatus;
}

export interface AccessTokenRecord {
  tokenHash: string; // Primary key
  userId: string;
  clientId: string;
  scope: string;
  createdAt: Date;
  expiresAt: Date;
}

// =====================
// OAuth Clients
// =====================
export interface CreateOAuthClientInput {
  clientId?: string;
  clientSecret?: string;
  clientName: string;
  redirectUris: string[];
  grantTypes?: string[];
  responseTypes?: string[];
  scope?: string;
  tokenEndpointAuthMethod?: string;
}

export interface OAuthClientRecord {
  clientId: string; // Primary key
  clientSecret: string | null;
  clientName: string;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes: string[];
  scope: string;
  tokenEndpointAuthMethod: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OAuthClientSnakeCaseRecord {
  client_id: string;
  client_secret: string | null;
  client_name: string;
  description: string | null;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  scope: string;
  token_endpoint_auth_method: string;
  created_at: Date;
}

// =====================
// Users
// =====================
export interface EnsureUserInput {
  userId: string;
  email?: string | null;
  username?: string | null;
  name?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
}

export interface UserRecord {
  userId: string; // Primary key
  email: string | null;
  name: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// =====================
// Audit Logs
// =====================
export interface AuditLogEntryInput {
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  userId?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogRecord {
  id: number;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  userId: string | null;
  clientId: string | null;
  clientName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// =====================
// Cleanup
// =====================
export interface CleanupTokensResult {
  refreshTokens: number;
  accessTokens: number;
}

// =====================
// Execution History
// =====================
export interface CreateExecutionHistoryInput {
  sessionId: string;
  toolName: string;
  args?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  status?: ExecutionStatus;
  executionTime?: number | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  userId?: string | null;
  clientId?: string | null;
}

export interface ExecutionHistoryRecord {
  id: number;
  sessionId: string;
  toolName: string;
  args: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  status: ExecutionStatus;
  executionTime: number | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  userId: string | null;
  clientId: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

// =====================
// Whitelist
// =====================
export interface CreateWhitelistEntryInput {
  type: WhitelistType;
  name: string;
  description?: string | null;
  reason?: string | null;
  blockedVersions?: string[] | null;
  allowedVersions?: string[] | null;
  isActive?: boolean;
  createdBy?: string | null;
  approvedBy?: string | null;
  approvalDate?: Date | null;
  expiresAt?: Date | null;
}

export interface WhitelistEntryRecord {
  id: number;
  type: WhitelistType;
  name: string;
  description: string | null;
  reason: string | null;
  blockedVersions: string[] | null;
  allowedVersions: string[] | null;
  isActive: boolean;
  createdBy: string | null;
  approvedBy: string | null;
  approvalDate: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

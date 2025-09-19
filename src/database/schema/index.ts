import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  serial,
  jsonb,
  inet,
  index,
  pgEnum,
  uuid,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// Enums
// ============================================

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'suspended',
  'deleted',
]);
export const tokenStatusEnum = pgEnum('token_status', [
  'active',
  'revoked',
  'expired',
]);
export const executionStatusEnum = pgEnum('execution_status', [
  'success',
  'failure',
  'in_progress',
]);
export const whitelistTypeEnum = pgEnum('whitelist_type', [
  'package',
  'domain',
]);

// ============================================
// OAuth Tables (Enhanced)
// ============================================

// OAuth Clients table
export const oauthClients = pgTable(
  'oauth_clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: varchar('client_id', { length: 255 }).unique().notNull(),
    clientSecret: varchar('client_secret', { length: 512 }),
    clientName: varchar('client_name', { length: 255 }).notNull(),
    description: text('description'),
    redirectUris: text('redirect_uris').array().notNull(),
    grantTypes: text('grant_types')
      .array()
      .default(['authorization_code', 'refresh_token']),
    responseTypes: text('response_types').array().default(['code']),
    scope: text('scope').default('openid profile email'),
    tokenEndpointAuthMethod: varchar('token_endpoint_auth_method', {
      length: 50,
    }).default('client_secret_basic'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('idx_oauth_clients_client_id').on(table.clientId),
    index('idx_oauth_clients_is_active').on(table.isActive),
  ],
);

// Auth Codes table
export const authCodes = pgTable(
  'auth_codes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 512 }).primaryKey(),
    userId: varchar('student_id', { length: 255 }).notNull(),
    clientId: varchar('client_id', { length: 255 })
      .notNull()
      .references(() => oauthClients.clientId, { onDelete: 'cascade' }),
    codeChallenge: varchar('code_challenge', { length: 512 }), // ChatGPT는 PKCE 미지원 - NULL 허용으로 변경
    codeChallengeMethod: varchar('code_challenge_method', {
      length: 10,
    }).default('S256'),
    redirectUri: text('redirect_uri').notNull(),
    scope: text('scope').default('mcp:*'),
    state: text('state'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('idx_auth_codes_code').on(table.code),
    index('idx_auth_codes_user_id').on(table.userId),
    index('idx_auth_codes_expires_at').on(table.expiresAt),
  ],
);

// Refresh Tokens table
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    refreshToken: varchar('refresh_token', { length: 512 }).unique().notNull(),
    userId: uuid('user_id').notNull(),
    clientId: varchar('client_id', { length: 255 }).notNull(),
    scope: text('scope').default('openid profile email'),
    family: varchar('family', { length: 255 }), // Token rotation family
    status: tokenStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idx_refresh_tokens_token').on(table.refreshToken),
    index('idx_refresh_tokens_user_id').on(table.userId),
    index('idx_refresh_tokens_client_id').on(table.clientId),
    index('idx_refresh_tokens_status').on(table.status),
  ],
);

// Access Tokens table
export const accessTokens = pgTable(
  'access_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tokenHash: varchar('token_hash', { length: 512 }).unique().notNull(),
    jti: varchar('jti', { length: 255 }).unique(), // JWT ID
    userId: uuid('user_id').notNull(),
    clientId: varchar('client_id', { length: 255 }).notNull(),
    scope: text('scope').default('openid profile email'),
    status: tokenStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idx_access_tokens_hash').on(table.tokenHash),
    index('idx_access_tokens_user_id').on(table.userId),
    index('idx_access_tokens_expires_at').on(table.expiresAt),
    index('idx_access_tokens_status').on(table.status),
  ],
);

// ============================================
// User Management Tables
// ============================================

// Users table (replacing Students with enhanced fields)
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Basic info
    email: varchar('email', { length: 255 }).unique().notNull(),
    username: varchar('username', { length: 255 }).unique(),
    passwordHash: varchar('password_hash', { length: 255 }),

    // Profile
    name: varchar('name', { length: 255 }),
    avatarUrl: text('avatar_url'),
    phoneNumber: varchar('phone_number', { length: 50 }),

    // Verification & Security
    emailVerified: boolean('email_verified').default(false),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    phoneVerified: boolean('phone_verified').default(false),
    twoFactorEnabled: boolean('two_factor_enabled').default(false),
    twoFactorSecret: text('two_factor_secret'), // Should be encrypted

    // Status
    status: userStatusEnum('status').default('active').notNull(),
    role: varchar('role', { length: 50 }).default('user'), // Simple role field

    // Metadata
    metadata: jsonb('metadata'), // Flexible field for additional data
    preferences: jsonb('preferences'), // User preferences

    // Timestamps
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete
  },
  (table) => [
    index('idx_users_email').on(table.email),
    index('idx_users_username').on(table.username),
    index('idx_users_status').on(table.status),
    index('idx_users_role').on(table.role),
  ],
);

// User Sessions table (for managing multiple login sessions)
export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionToken: varchar('session_token', { length: 512 }).unique().notNull(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    deviceInfo: jsonb('device_info'),
    lastActivityAt: timestamp('last_activity_at', {
      withTimezone: true,
    }).defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_user_sessions_user_id').on(table.userId),
    uniqueIndex('idx_user_sessions_token').on(table.sessionToken),
    index('idx_user_sessions_expires_at').on(table.expiresAt),
  ],
);

// ============================================
// Audit & Security Tables
// ============================================

// Audit Logs table (enhanced version)
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 100 }),
    entityId: varchar('entity_id', { length: 255 }),
    userId: uuid('user_id'),
    clientId: varchar('client_id', { length: 255 }),
    clientName: varchar('client_name', { length: 255 }),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_audit_logs_created_at').on(table.createdAt),
    index('idx_audit_logs_event_type').on(table.eventType),
    index('idx_audit_logs_user_id').on(table.userId),
  ],
);

// ============================================
// Universal MCP Tables (Enhanced)
// ============================================

// Execution History table
export const executionHistory = pgTable(
  'execution_history',
  {
    id: serial('id').primaryKey(),
    sessionId: varchar('session_id', { length: 255 }).notNull(),
    userId: uuid('user_id'),
    clientId: varchar('client_id', { length: 255 }),
    toolName: varchar('tool_name', { length: 255 }).notNull(),
    args: jsonb('args'),
    result: jsonb('result'),
    status: executionStatusEnum('status').default('in_progress').notNull(),
    executionTime: integer('execution_time'), // milliseconds
    errorMessage: text('error_message'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_execution_history_session_id').on(table.sessionId),
    index('idx_execution_history_tool_name').on(table.toolName),
    index('idx_execution_history_status').on(table.status),
    index('idx_execution_history_user_id').on(table.userId),
  ],
);

// Whitelist table
export const whitelist = pgTable(
  'whitelist',
  {
    id: serial('id').primaryKey(),
    type: whitelistTypeEnum('type').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    reason: text('reason'),
    blockedVersions: text('blocked_versions').array(),
    allowedVersions: text('allowed_versions').array(),
    isActive: boolean('is_active').default(true),
    createdBy: uuid('created_by'),
    approvedBy: uuid('approved_by'),
    approvalDate: timestamp('approval_date', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('idx_whitelist_type_name').on(table.type, table.name),
    index('idx_whitelist_is_active').on(table.isActive),
  ],
);

// ============================================
// Relations (for Drizzle ORM query builder)
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(userSessions),
  authCodes: many(authCodes),
  accessTokens: many(accessTokens),
  refreshTokens: many(refreshTokens),
}));

export const oauthClientsRelations = relations(oauthClients, ({ many }) => ({
  authCodes: many(authCodes),
  accessTokens: many(accessTokens),
  refreshTokens: many(refreshTokens),
}));

// Type exports for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type OAuthClient = typeof oauthClients.$inferSelect;
export type NewOAuthClient = typeof oauthClients.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

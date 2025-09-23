import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import * as crypto from 'crypto';

import * as schema from '../../database/schema';
import { DrizzleService } from '../../database/drizzle.service';

export interface CreateRefreshTokenInput {
  refreshToken: string;
  userId: string;
  clientId: string;
  scope: string;
  family?: string | null;
  expiresAt?: Date;
}

@Injectable()
export class RefreshTokenRepository {
  private db!: NodePgDatabase<typeof schema>;
  constructor(private readonly drizzleService: DrizzleService) {}

  async onModuleInit() {
    this.db = this.drizzleService.getDb();
  }

  async create(input: CreateRefreshTokenInput) {
    const expiresAt =
      input.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const family =
      input.family ||
      (typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : crypto.randomBytes(16).toString('hex'));

    const insertPayload: typeof schema.refreshTokens.$inferInsert = {
      refreshToken: input.refreshToken,
      userId: input.userId,
      clientId: input.clientId,
      scope: input.scope,
      family,
      expiresAt,
    };

    const [refreshToken] = await this.db
      .insert(schema.refreshTokens)
      .values(insertPayload)
      .returning();

    return refreshToken;
  }

  async findByToken(token: string) {
    const [refreshToken] = await this.db
      .select()
      .from(schema.refreshTokens)
      .where(
        and(
          eq(schema.refreshTokens.refreshToken, token),
          eq(schema.refreshTokens.status, 'active'),
        ),
      )
      .limit(1);

    if (!refreshToken) {
      return null;
    }

    // Check if expired
    if (refreshToken.expiresAt && refreshToken.expiresAt < new Date()) {
      await this.deleteByToken(token);
      return null;
    }

    return refreshToken;
  }

  async deleteByToken(token: string) {
    await this.db
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.refreshToken, token));
  }

  async markAsRevoked(token: string) {
    await this.db
      .update(schema.refreshTokens)
      .set({
        status: 'revoked',
        revokedAt: new Date(),
      })
      .where(eq(schema.refreshTokens.refreshToken, token));
  }

  async rotateToken(oldToken: string, input: CreateRefreshTokenInput) {
    return this.drizzleService.transaction(async (tx) => {
      const [revokedToken] = await tx
        .update(schema.refreshTokens)
        .set({
          status: 'revoked',
          revokedAt: new Date(),
        })
        .where(
          and(
            eq(schema.refreshTokens.refreshToken, oldToken),
            eq(schema.refreshTokens.status, 'active'),
          ),
        )
        .returning({ id: schema.refreshTokens.id });

      if (!revokedToken) {
        throw new Error('Refresh token not found or already revoked');
      }

      const expiresAt =
        input.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const family =
        input.family ||
        (typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : crypto.randomBytes(16).toString('hex'));

      const [refreshToken] = await tx
        .insert(schema.refreshTokens)
        .values({
          refreshToken: input.refreshToken,
          userId: input.userId,
          clientId: input.clientId,
          scope: input.scope,
          family,
          expiresAt,
        })
        .returning();

      return refreshToken;
    });
  }

  async deleteByUserId(userId: string) {
    await this.db
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.userId, userId));
  }

  async deleteByClientId(clientId: string) {
    await this.db
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.clientId, clientId));
  }

  async revokeToken(token: string) {
    // Same as deleteByToken but named for clarity in revocation context
    await this.markAsRevoked(token);
  }
}

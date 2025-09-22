import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';

import * as schema from '../../database/schema';
import { DrizzleService } from '../../database/drizzle.service';

export interface CreateAccessTokenInput {
  tokenHash: string;
  userId: string;
  clientId: string;
  scope: string;
}

@Injectable()
export class AccessTokenRepository {
  private db!: NodePgDatabase<typeof schema>;
  constructor(private readonly drizzleService: DrizzleService) {}

  async onModuleInit() {
    this.db = this.drizzleService.getDb();
  }

  async create(input: CreateAccessTokenInput) {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const insertPayload: typeof schema.accessTokens.$inferInsert = {
      tokenHash: input.tokenHash,
      userId: input.userId,
      clientId: input.clientId,
      scope: input.scope,
      expiresAt,
    };

    const [accessToken] = await this.db
      .insert(schema.accessTokens)
      .values(insertPayload)
      .returning();

    return accessToken;
  }

  async findByTokenHash(tokenHash: string) {
    const [accessToken] = await this.db
      .select()
      .from(schema.accessTokens)
      .where(eq(schema.accessTokens.tokenHash, tokenHash))
      .limit(1);

    if (!accessToken) {
      return null;
    }

    // Check if expired
    if (accessToken.expiresAt && accessToken.expiresAt < new Date()) {
      await this.deleteByTokenHash(tokenHash);
      return null;
    }

    return accessToken;
  }

  async deleteByTokenHash(tokenHash: string) {
    await this.db
      .delete(schema.accessTokens)
      .where(eq(schema.accessTokens.tokenHash, tokenHash));
  }

  async deleteByUserId(userId: string) {
    await this.db
      .delete(schema.accessTokens)
      .where(eq(schema.accessTokens.userId, userId));
  }

  async deleteByClientId(clientId: string) {
    await this.db
      .delete(schema.accessTokens)
      .where(eq(schema.accessTokens.clientId, clientId));
  }

  async deleteExpired() {
    await this.db
      .delete(schema.accessTokens)
      .where(eq(schema.accessTokens.expiresAt, new Date()));
  }

  async revokeByTokenHash(tokenHash: string) {
    // Same as deleteByTokenHash but named for clarity in revocation context
    await this.deleteByTokenHash(tokenHash);
  }
}
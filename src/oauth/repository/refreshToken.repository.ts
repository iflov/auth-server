import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';

import * as schema from '../../database/schema';
import { DrizzleService } from '../../database/drizzle.service';

export interface CreateRefreshTokenInput {
  refreshToken: string;
  userId: string;
  clientId: string;
  scope: string;
}

@Injectable()
export class RefreshTokenRepository {
  private db!: NodePgDatabase<typeof schema>;
  constructor(private readonly drizzleService: DrizzleService) {}

  async onModuleInit() {
    this.db = this.drizzleService.getDb();
  }

  async create(input: CreateRefreshTokenInput) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const insertPayload: typeof schema.refreshTokens.$inferInsert = {
      refreshToken: input.refreshToken,
      userId: input.userId,
      clientId: input.clientId,
      scope: input.scope,
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
      .where(eq(schema.refreshTokens.refreshToken, token))
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
    await this.deleteByToken(token);
  }
}

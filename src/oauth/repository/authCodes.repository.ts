import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';

import * as schema from '../../database/schema';
import { DrizzleService } from '../../database/drizzle.service';
import { CreateAuthorizationCodeInput } from '../types/oauth.types';

@Injectable()
export class AuthCodesRepository {
  private db!: NodePgDatabase<typeof schema>;
  constructor(private readonly drizzleService: DrizzleService) {}

  async onModuleInit() {
    this.db = this.drizzleService.getDb();
  }

  async create(authCodeInput: CreateAuthorizationCodeInput) {
    const insertPayload: typeof schema.authCodes.$inferInsert = {
      code: authCodeInput.code,
      userId: authCodeInput.userId,
      clientId: authCodeInput.clientId,
      redirectUri: authCodeInput.redirectUri,
      scope: authCodeInput.scope ?? undefined,
      state: authCodeInput.state ?? null,
      codeChallenge: authCodeInput.codeChallenge ?? null,
      codeChallengeMethod: authCodeInput.codeChallengeMethod ?? null,
      expiresAt: authCodeInput.expiresAt,
    };

    const [authCode] = await this.db
      .insert(schema.authCodes)
      .values(insertPayload)
      .returning();

    return authCode;
  }

  async findByCode(code: string) {
    const [authCode] = await this.db
      .select()
      .from(schema.authCodes)
      .where(eq(schema.authCodes.code, code))
      .limit(1);

    if (!authCode) {
      return null;
    }

    // Check if expired
    if (authCode.expiresAt < new Date()) {
      await this.deleteByCode(code);
      return null;
    }

    return authCode;
  }

  async deleteByCode(code: string) {
    await this.db
      .delete(schema.authCodes)
      .where(eq(schema.authCodes.code, code));
  }

  async deleteExpired() {
    await this.db
      .delete(schema.authCodes)
      .where(eq(schema.authCodes.expiresAt, new Date()));
  }
}

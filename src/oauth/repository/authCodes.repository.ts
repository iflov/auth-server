import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

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

  async find() {}

  async findOne() {}

  async update() {}

  async delete() {}
}

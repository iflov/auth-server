import { Injectable, ConflictException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';

import * as schema from '../../database/schema';
import { DrizzleService } from '../../database/drizzle.service';
import { CreateOAuthClientInput } from '../types/oauth.types';

@Injectable()
export class OAuthClientRepository {
  private db!: NodePgDatabase<typeof schema>;
  constructor(private readonly drizzleService: DrizzleService) {}

  async onModuleInit() {
    this.db = this.drizzleService.getDb();
  }

  async create(oauthClient: CreateOAuthClientInput) {
    try {
      const [client] = await this.db
        .insert(schema.oauthClients)
        .values({
          clientId: oauthClient.clientId,
          clientSecret: oauthClient.clientSecret,
          clientName: oauthClient.clientName,
          description: oauthClient.description,
          redirectUris: oauthClient.redirectUris,
          grantTypes: oauthClient.grantTypes,
          responseTypes: oauthClient.responseTypes,
          scope: oauthClient.scope,
          tokenEndpointAuthMethod: oauthClient.tokenEndpointAuthMethod,
          isActive: oauthClient.isActive,
        })
        .returning();

      return client;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Client ID already exists');
      }
      console.error('Error creating client:', error);
      throw error;
    }
  }

  async find() {}

  async findOne(clientId: string) {
    const [client] = await this.db
      .select()
      .from(schema.oauthClients)
      .where(eq(schema.oauthClients.clientId, clientId));

    return client || null;
  }

  async update() {}

  async delete() {}
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '../../database/schema';
import { DrizzleService } from '../../database/drizzle.service';
import { AuditLogEntryInput } from '../types/oauth.types';

@Injectable()
export class AuditLogsRepository {
  private db!: NodePgDatabase<typeof schema>;
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.db = this.drizzleService.getDb();
  }

  async create(auditLogInput: AuditLogEntryInput) {
    const [auditLog] = await this.db
      .insert(schema.auditLogs)
      .values(auditLogInput)
      .returning();

    return auditLog;
  }

  async find() {}

  async findOne() {}

  async update() {}

  async delete() {}
}

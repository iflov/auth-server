import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';

import * as schema from '../../database/schema';
import { DrizzleService } from '../../database/drizzle.service';

@Injectable()
export class UserRepository {
  private db!: NodePgDatabase<typeof schema>;
  constructor(private readonly drizzleService: DrizzleService) {}

  async onModuleInit() {
    this.db = this.drizzleService.getDb();
  }

  async findOrCreate(userId: string) {
    // First try to find the user
    const [existingUser] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (existingUser) {
      // Update last login
      await this.db
        .update(schema.users)
        .set({
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));

      return existingUser;
    }

    // Create new user if not exists
    const insertPayload: typeof schema.users.$inferInsert = {
      email: `user-${userId}@example.com`, // Placeholder email
      name: `User ${userId.substring(0, 8)}`,
      lastLoginAt: new Date(),
    };

    const [newUser] = await this.db
      .insert(schema.users)
      .values(insertPayload)
      .returning();

    return newUser;
  }

  async findById(userId: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    return user || null;
  }

  async updateLastActivity(userId: string) {
    await this.db
      .update(schema.users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));
  }
}

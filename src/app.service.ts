import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PoolClient } from 'pg';

import { DrizzleService } from './database/drizzle.service';
import { RootEndPointResponse, HealthCheckResponse } from './types/app.type';
@Injectable()
export class AppService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async getRootEndPoint(): Promise<RootEndPointResponse> {
    return {
      name: 'OAuth Server',
      version: '1.0.0',
      status: 'ok',
      endpoints: {
        health: '/health',
        wellKnown: '/.well-known/oauth-authorization-server',
        authorize: '/authorize',
        token: '/token',
        register: '/register',
      },
    };
  }

  async getHealth(): Promise<HealthCheckResponse> {
    try {
      const dbHealthy = await this.checkDatabaseHealth();

      const health = {
        status: dbHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: dbHealthy ? 'connected' : 'disconnected',
        },
      };

      return health as HealthCheckResponse;
    } catch {
      throw new ServiceUnavailableException({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    let client: PoolClient;

    try {
      client = await this.drizzleService.getPool().connect();
      await client.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}

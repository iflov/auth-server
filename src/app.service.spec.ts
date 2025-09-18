import { ServiceUnavailableException } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

import { AppService } from './app.service';
import { DrizzleService } from './database/drizzle.service';

describe('AppService', () => {
  let service: AppService;
  let mockPool: { connect: jest.Mock };
  let mockClient: { query: jest.Mock; release: jest.Mock };
  let mockDrizzleService: { getPool: jest.Mock };
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;

    mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
      release: jest.fn(),
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient as unknown as PoolClient),
    };

    mockDrizzleService = {
      getPool: jest.fn().mockReturnValue(mockPool as unknown as Pool),
    };

    service = new AppService(mockDrizzleService as unknown as DrizzleService);
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalEnv;
    }
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('getRootEndPoint', () => {
    it('returns static metadata for the root endpoint', async () => {
      await expect(service.getRootEndPoint()).resolves.toEqual({
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
      });
    });
  });

  describe('getHealth', () => {
    it('returns healthy status when the database check succeeds', async () => {
      const result = await service.getHealth();

      expect(result.status).toBe('healthy');
      expect(result.services.database).toBe('connected');
      expect(result.timestamp).toEqual(expect.any(String));
      expect(typeof result.uptime).toBe('number');
      expect(mockDrizzleService.getPool).toHaveBeenCalledTimes(1);
      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('returns unhealthy status when the database connection fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPool.connect.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await service.getHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database).toBe('disconnected');
      expect(mockClient.query).not.toHaveBeenCalled();
      expect(mockClient.release).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('returns unhealthy status when the database query fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockClient.query.mockRejectedValueOnce(new Error('Query failed'));

      const result = await service.getHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database).toBe('disconnected');
      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockClient.release).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it('uses NODE_ENV when provided', async () => {
      process.env.NODE_ENV = 'production';

      const result = await service.getHealth();

      expect(result.environment).toBe('production');
    });

    it('falls back to development when NODE_ENV is missing', async () => {
      delete process.env.NODE_ENV;

      const result = await service.getHealth();

      expect(result.environment).toBe('development');
    });

    it('throws ServiceUnavailableException when the health check rejects', async () => {
      jest
        .spyOn(service as any, 'checkDatabaseHealth')
        .mockRejectedValueOnce(new Error('unexpected'));

      await expect(service.getHealth()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});

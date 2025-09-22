import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

import { OAuthClientRepository } from '../repository/oauthClient.repository';
import { AuditLogsRepository } from '../repository/auditLogs.repository';
import { OAuthUnauthorizedException } from '../exceptions/oauth-unauthorized.exception';

// Request 타입 확장
export interface RequestWithClientAuth extends Request {
  clientAuth?: ClientAuthInfo;
}

export interface ClientAuthInfo {
  authenticated: boolean;
  method: 'client_secret_basic' | 'client_secret_post' | 'none';
  clientId: string | null;
  clientInfo: {
    client_id: string;
    client_name: string;
    redirect_uris: string[];
    grant_types: string[];
    scope: string;
    is_confidential: boolean;
  } | null;
}

@Injectable()
export class ClientAuthGuard implements CanActivate {
  constructor(
    private readonly oauthClientRepository: OAuthClientRepository,
    private readonly auditLogsRepository: AuditLogsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithClientAuth>();

    try {
      let clientId: string | null = null;
      let clientSecret: string | null = null;
      let authMethod: 'client_secret_basic' | 'client_secret_post' | 'none' =
        'none';

      // 1. Check for HTTP Basic Authentication (client_secret_basic)
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Basic ')) {
        const base64Credentials = authHeader.slice(6);
        const credentials = Buffer.from(base64Credentials, 'base64').toString(
          'utf-8',
        );
        const [basicClientId, basicClientSecret] = credentials.split(':');

        if (basicClientId && basicClientSecret) {
          clientId = decodeURIComponent(basicClientId);
          clientSecret = decodeURIComponent(basicClientSecret);
          authMethod = 'client_secret_basic';

          // Remove client credentials from body if present
          delete request.body.client_id;
          delete request.body.client_secret;
        }
      }

      // 2. Check for client_secret_post (credentials in body)
      if (!clientId && request.body.client_id) {
        clientId = request.body.client_id;
        clientSecret = request.body.client_secret;
        authMethod = clientSecret ? 'client_secret_post' : 'none';
      }

      // 3. If no client_id found, it might be a public client flow
      if (!clientId) {
        // For some endpoints like token refresh, client_id might be optional
        request.clientAuth = {
          authenticated: false,
          method: 'none',
          clientId: null,
          clientInfo: null,
        };
        return true; // Let the endpoint handle it
      }

      // 4. Validate client credentials
      const client = await this.oauthClientRepository.findOne(clientId);

      if (!client) {
        throw new OAuthUnauthorizedException(
          'invalid_client',
          'Client authentication failed: unknown client',
        );
      }

      // 5. Verify client secret if provided
      if (authMethod !== 'none') {
        // Confidential client - must provide valid secret
        if (!client.clientSecret) {
          throw new OAuthUnauthorizedException(
            'invalid_client',
            'Client authentication failed: client is not configured for this authentication method',
          );
        }

        if (client.clientSecret !== clientSecret) {
          // Log failed authentication attempt
          await this.auditLogsRepository.create({
            eventType: 'client_auth_failed',
            clientId,
            userId: null,
            ipAddress: request.ip,
            userAgent: request.get('user-agent'),
          });

          throw new OAuthUnauthorizedException(
            'invalid_client',
            'Client authentication failed: invalid credentials',
          );
        }
      } else {
        // Public client - no secret required, but should use PKCE
        if (client.clientSecret) {
          // This is a confidential client, it should provide credentials
          throw new OAuthUnauthorizedException(
            'invalid_client',
            'Client authentication failed: confidential client must authenticate',
          );
        }
      }

      // 6. Store authenticated client info in request
      request.clientAuth = {
        authenticated: authMethod !== 'none',
        method: authMethod,
        clientId: client.clientId,
        clientInfo: {
          client_id: client.clientId,
          client_name: client.clientName,
          redirect_uris: client.redirectUris,
          grant_types: client.grantTypes,
          scope: client.scope,
          is_confidential: !!client.clientSecret,
        },
      };

      // Log successful authentication for confidential clients
      if (authMethod !== 'none') {
        await this.auditLogsRepository.create({
          eventType: 'client_auth_success',
          clientId: client.clientId,
          userId: null,
          ipAddress: request.ip,
          userAgent: request.get('user-agent'),
        });
      }

      return true;
    } catch (error) {
      // Re-throw OAuthUnauthorizedException as is
      if (error instanceof OAuthUnauthorizedException) {
        throw error;
      }

      // Log unexpected errors
      console.error('Client authentication error:', error);
      throw new OAuthUnauthorizedException(
        'server_error',
        'An error occurred during client authentication',
      );
    }
  }
}

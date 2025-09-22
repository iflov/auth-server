import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import {
  RequestWithClientAuth,
  ClientAuthInfo,
} from '../guards/client-auth.guard';

/**
 * Custom decorator to extract client authentication info from request
 *
 * @example
 * ```typescript
 * @Post('token')
 * @UseGuards(ClientAuthGuard)
 * async token(@ClientAuth() clientAuth: ClientAuthInfo) {
 *   console.log(clientAuth.clientId);
 *   console.log(clientAuth.authenticated);
 * }
 * ```
 */
export const ClientAuth = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ClientAuthInfo | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithClientAuth>();
    return request.clientAuth;
  },
);

/**
 * Decorator to get only the client ID
 *
 * @example
 * ```typescript
 * @Post('token')
 * @UseGuards(ClientAuthGuard)
 * async token(@ClientId() clientId: string | null) {
 *   console.log(clientId);
 * }
 * ```
 */
export const ClientId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<RequestWithClientAuth>();
    return request.clientAuth?.clientId || null;
  },
);

/**
 * Decorator to check if client is authenticated
 *
 * @example
 * ```typescript
 * @Post('token')
 * @UseGuards(ClientAuthGuard)
 * async token(@IsClientAuthenticated() isAuthenticated: boolean) {
 *   if (!isAuthenticated) {
 *     // Handle public client
 *   }
 * }
 * ```
 */
export const IsClientAuthenticated = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): boolean => {
    const request = ctx.switchToHttp().getRequest<RequestWithClientAuth>();
    return request.clientAuth?.authenticated || false;
  },
);

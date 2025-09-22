import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';
import { OAuthUnauthorizedException } from '../exceptions/oauth-unauthorized.exception';

/**
 * Exception filter for handling OAuth unauthorized errors
 * Automatically sets WWW-Authenticate header for 401 responses
 */
@Catch(OAuthUnauthorizedException)
export class OAuthUnauthorizedFilter implements ExceptionFilter {
  catch(exception: OAuthUnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Set WWW-Authenticate header for OAuth 401 errors
    response.setHeader(
      'WWW-Authenticate',
      exception.getWWWAuthenticateHeader(),
    );

    // Return standard OAuth error response
    response.status(401).json({
      error: exception.error,
      error_description: exception.errorDescription,
    });
  }
}

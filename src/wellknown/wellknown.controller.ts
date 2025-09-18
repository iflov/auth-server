import { Controller, Get, Header, Headers, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('.well-known')
export class WellKnownController {
  @Get('oauth-authorization-server')
  @Header('Content-Type', 'application/json')
  @Header('Cache-Control', 'public, max-age=3600')
  getOAuthAuthorizationServer(
    @Req() req: Request,
    @Headers('host') host: string,
  ) {
    const protocol = req.protocol ?? 'http';
    const baseUrl = `${protocol}://${host}`;

    return {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
        'none',
      ],
      registration_endpoint: `${baseUrl}/oauth/register`,
      introspection_endpoint: `${baseUrl}/oauth/introspect`,
      revocation_endpoint: `${baseUrl}/oauth/revoke`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      scopes_supported: ['mcp:*'],
      authorization_response_iss_parameter_supported: true,
      require_pushed_authorization_requests: false,
      service_documentation: `${baseUrl}/docs`,
      ui_locales_supported: ['en-US'],
      claims_parameter_supported: false,
      request_parameter_supported: false,
      request_uri_parameter_supported: false,
      require_request_uri_registration: false,
    };
  }
}

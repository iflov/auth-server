import { UnauthorizedException } from '@nestjs/common';

/**
 * Custom exception for OAuth unauthorized errors with WWW-Authenticate header support
 */
export class OAuthUnauthorizedException extends UnauthorizedException {
  public readonly error: string;
  public readonly errorDescription: string;

  constructor(error: string, errorDescription: string) {
    super({
      error,
      error_description: errorDescription,
    });

    this.error = error;
    this.errorDescription = errorDescription;
  }

  /**
   * Generate WWW-Authenticate header value
   */
  getWWWAuthenticateHeader(): string {
    return `Basic realm="OAuth2", error="${this.error}", error_description="${this.errorDescription}"`;
  }
}

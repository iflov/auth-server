import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { JwtService } from '@nestjs/jwt';

import { AuditLogsRepository } from './repository/auditLogs.repository';
import { OAuthClientRepository } from './repository/oauthClient.repository';
import { AuthCodesRepository } from './repository/authCodes.repository';
import { RefreshTokenRepository } from './repository/refreshToken.repository';
import { AccessTokenRepository } from './repository/accessToken.repository';
import { UserRepository } from './repository/user.repository';
import {
  AuditLogEntryInput,
  CreateOAuthClientInput,
} from './types/oauth.types';
import { normalizeUrlFunction } from '../utils/normalizeUrl';
import { generateAuthCode } from '../utils/generateAuthCode';
import { RequestRegisterDto } from './dto/request-register.dto';
import { PostAuthorizeDto } from './dto/post-authorize.dto';

@Injectable()
export class OauthService {
  constructor(
    private readonly oauthClientRepository: OAuthClientRepository,
    private readonly auditLogsRepository: AuditLogsRepository,
    private readonly authCodesRepository: AuthCodesRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly accessTokenRepository: AccessTokenRepository,
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async register({
    ip,
    userAgent,
    oauthClient,
  }: {
    ip: string;
    userAgent: string;
    oauthClient: RequestRegisterDto;
  }) {
    const clientId: string =
      oauthClient.client_id ||
      `client_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const clientSecret: string =
      oauthClient.client_secret || crypto.randomBytes(32).toString('hex');

    const clientObject: CreateOAuthClientInput = {
      clientId,
      clientSecret,
      clientName: oauthClient.client_name || 'Claude',
      grantTypes: oauthClient.grant_types || [
        'authorization_code',
        'refresh_token',
      ],
      responseTypes: oauthClient.response_types || ['code'],
      tokenEndpointAuthMethod:
        oauthClient.token_endpoint_auth_method || 'client_secret_post',
      scope: oauthClient.scope || 'claudeai',
      redirectUris: oauthClient.redirect_uris || [
        'https://claude.ai/api/mcp/auth_callback',
      ],
    };

    const client = await this.oauthClientRepository.create(clientObject);

    const auditLogInput: AuditLogEntryInput = {
      eventType: 'client_registered',
      clientId: client.clientId,
      clientName: client.clientName,
      ipAddress: ip,
      userAgent: userAgent,
    };

    await this.auditLogsRepository.create(auditLogInput);

    return client;
  }

  async authorize({
    ip,
    userAgent,
    body,
  }: {
    ip: string;
    userAgent: string;
    body: PostAuthorizeDto;
  }) {
    const client = await this.oauthClientRepository.findOne(body.client_id);

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const normalizedRedirectUri = normalizeUrlFunction(body.redirect_uri);

    const redirectMatch = client.redirectUris.some((registeredUri) => {
      return normalizeUrlFunction(registeredUri) === normalizedRedirectUri;
    });

    if (!redirectMatch) {
      throw new BadRequestException('Redirect URI mismatch');
    }

    const ttlSeconds = this.configService.get<number>(
      'auth.oauthCodeExpiry',
      600, // 기본값 600초 (10분)
    );

    const authCode = generateAuthCode();

    const authCodeInput = {
      code: authCode,
      userId: body.user_id,
      clientId: client.clientId,
      codeChallenge: body.code_challenge ?? null, // ChatGPT는 PKCE 미지원
      codeChallengeMethod:
        body.code_challenge_method ?? (body.code_challenge ? 'S256' : null),
      redirectUri: body.redirect_uri,
      scope: body.scope ?? 'claudeai',
      state: body.state ?? null,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    };

    await this.authCodesRepository.create(authCodeInput);

    await this.auditLogsRepository.create({
      eventType: 'authorization_granted',
      clientId: client.clientId,
      userId: body.user_id,
      ipAddress: ip,
      userAgent: userAgent,
    });

    const redirectUrl = new URL(body.redirect_uri);
    redirectUrl.searchParams.set('code', authCode);
    redirectUrl.searchParams.set('state', body.state ?? '');

    return redirectUrl.toString();
  }

  /**
   * Token exchange - authorization code를 access token으로 교환
   */
  async exchangeToken(
    params: {
      grant_type?: string;
      code?: string;
      redirect_uri?: string;
      client_id?: string;
      clientId?: string;
      code_verifier?: string;
      refresh_token?: string;
      scope?: string;
      isAuthenticated?: boolean;
    },
    ip: string,
    userAgent: string,
  ) {
    const { grant_type } = params;
    let userId: string | null = null;
    let clientId: string | null = null;
    let scope = 'default';

    if (grant_type === 'authorization_code') {
      // Validate required parameters
      if (!params.code) {
        throw new BadRequestException({
          error: 'invalid_request',
          error_description: 'Missing authorization code',
        });
      }

      // Find the authorization code
      const authCode = await this.authCodesRepository.findByCode(params.code);
      if (!authCode) {
        throw new BadRequestException({
          error: 'invalid_grant',
          error_description: 'Invalid or expired authorization code',
        });
      }

      // Verify client_id matches
      const requestClientId = params.clientId || params.client_id;
      if (!requestClientId || requestClientId !== authCode.clientId) {
        throw new BadRequestException({
          error: 'invalid_grant',
          error_description: 'Client mismatch',
        });
      }

      // For public clients (no authentication), PKCE is required
      if (!params.isAuthenticated) {
        if (!params.code_verifier) {
          throw new BadRequestException({
            error: 'invalid_request',
            error_description: 'code_verifier required for public clients',
          });
        }

        // Verify PKCE challenge
        const challenge = this.computeChallenge(params.code_verifier);
        if (challenge !== authCode.codeChallenge) {
          await this.auditLogsRepository.create({
            eventType: 'invalid_pkce',
            clientId: authCode.clientId,
            userId: null,
            ipAddress: ip,
            userAgent: userAgent,
          });

          throw new BadRequestException({
            error: 'invalid_grant',
            error_description: 'Invalid code_verifier',
          });
        }
      }
      // For confidential clients, PKCE is optional but validated if present
      else if (params.code_verifier) {
        const challenge = this.computeChallenge(params.code_verifier);
        if (challenge !== authCode.codeChallenge) {
          throw new BadRequestException({
            error: 'invalid_grant',
            error_description: 'Invalid code_verifier',
          });
        }
      }

      // Verify redirect_uri if provided
      if (params.redirect_uri && params.redirect_uri !== authCode.redirectUri) {
        throw new BadRequestException({
          error: 'invalid_grant',
          error_description: 'Redirect URI mismatch',
        });
      }

      userId = authCode.userId;
      clientId = authCode.clientId;
      scope = authCode.scope || 'default';

      // Delete the used authorization code
      await this.authCodesRepository.deleteByCode(params.code);
    } else if (grant_type === 'refresh_token') {
      // Validate refresh token
      if (!params.refresh_token) {
        throw new BadRequestException({
          error: 'invalid_request',
          error_description: 'Missing refresh_token',
        });
      }

      // Validate the refresh token with JWT
      const tokenPayload = await this.validateRefreshToken(
        params.refresh_token,
      );
      if (!tokenPayload) {
        throw new BadRequestException({
          error: 'invalid_grant',
          error_description: 'Invalid or expired refresh token',
        });
      }

      // Check in database
      const dbToken = await this.refreshTokenRepository.findByToken(
        params.refresh_token,
      );
      if (!dbToken) {
        throw new BadRequestException({
          error: 'invalid_grant',
          error_description: 'Refresh token not found or revoked',
        });
      }

      // For refresh token grant, verify client matches if authenticated
      if (params.isAuthenticated && params.clientId) {
        if (params.clientId !== dbToken.clientId) {
          throw new BadRequestException({
            error: 'invalid_grant',
            error_description: 'Client mismatch for refresh token',
          });
        }
      }

      userId = tokenPayload.sub;
      clientId = dbToken.clientId;
      scope = dbToken.scope || 'default';
    } else {
      throw new BadRequestException({
        error: 'unsupported_grant_type',
        error_description: `Grant type "${grant_type}" is not supported`,
      });
    }

    // Generate new tokens
    const { accessToken, expiresIn } = await this.createAccessToken(userId);
    const { refreshToken } = await this.createRefreshToken(userId);

    // Store refresh token in database
    await this.refreshTokenRepository.create({
      refreshToken,
      userId,
      clientId,
      scope,
    });

    // Store access token hash for introspection (optional)
    const tokenHash = this.hashToken(accessToken);
    await this.accessTokenRepository.create({
      tokenHash,
      userId,
      clientId,
      scope,
    });

    // Update or create user record
    await this.userRepository.findOrCreate(userId);

    // Log successful token issuance
    await this.auditLogsRepository.create({
      eventType: 'token_issued',
      userId,
      clientId,
      ipAddress: ip,
      userAgent: userAgent,
    });

    // Return tokens
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: scope,
    };
  }

  /**
   * OAuth 인증 페이지 렌더링
   */
  async renderAuthorizePage(params: {
    client_id: string;
    redirect_uri: string;
    response_type: string;
    scope?: string;
    state?: string;
    code_challenge?: string;
    code_challenge_method?: string;
  }): Promise<string> {
    try {
      // Client 정보 조회
      const client = await this.oauthClientRepository.findOne(params.client_id);

      if (!client) {
        throw new NotFoundException('Client not found');
      }

      // authorize.html 템플릿 렌더링
      const templatePath = path.join(
        process.cwd(),
        'templates',
        'authorize.html',
      );

      if (!fs.existsSync(templatePath)) {
        throw new Error('Authorization template not found');
      }

      let templateContent = fs.readFileSync(templatePath, 'utf-8');

      // 템플릿에 전달할 데이터 - 간단한 문자열 치환
      const templateData = {
        CLIENT_NAME: client.clientName,
        CLIENT_ID: params.client_id,
        REDIRECT_URI: params.redirect_uri,
        RESPONSE_TYPE: params.response_type,
        SCOPE: params.scope || 'default',
        STATE: params.state || '',
        CODE_CHALLENGE: params.code_challenge || '',
        CODE_CHALLENGE_METHOD: params.code_challenge_method || '',
      };

      // 간단한 템플릿 치환
      Object.keys(templateData).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        templateContent = templateContent.replace(regex, templateData[key]);
      });

      return templateContent;
    } catch (error) {
      console.error('Error rendering authorize page:', error);
      throw error;
    }
  }

  /**
   * Helper Methods for Token Management
   */

  /**
   * Create an access token for the user
   */
  private async createAccessToken(
    userId: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const expiresIn = this.configService.get<number>(
      'auth.accessTokenExpiry',
      3600, // Default 1 hour
    );

    const payload = {
      sub: userId,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresIn,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn,
    });

    return { accessToken, expiresIn };
  }

  /**
   * Create a refresh token for the user
   */
  private async createRefreshToken(
    userId: string,
  ): Promise<{ refreshToken: string; expiresIn: number }> {
    const expiresIn = this.configService.get<number>(
      'auth.refreshTokenExpiry',
      2592000, // Default 30 days
    );

    const payload = {
      sub: userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresIn,
    };

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn,
    });

    return { refreshToken, expiresIn };
  }

  /**
   * Validate a refresh token
   */
  private async validateRefreshToken(token: string): Promise<any | null> {
    try {
      const payload = this.jwtService.verify(token);

      // Check token type
      if (payload.type !== 'refresh') {
        return null;
      }

      return payload;
    } catch (error) {
      // Token is invalid or expired
      return null;
    }
  }

  /**
   * Compute PKCE challenge from verifier
   */
  private computeChallenge(verifier: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    return hash;
  }

  /**
   * Hash a token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

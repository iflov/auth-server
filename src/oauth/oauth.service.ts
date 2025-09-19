import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

import { AuditLogsRepository } from './repository/auditLogs.repository';
import { OAuthClientRepository } from './repository/oauthClient.repository';
import {
  AuditLogEntryInput,
  CreateAuthorizationCodeInput,
  CreateOAuthClientInput,
} from './types/oauth.types';
import { normalizeUrlFunction } from '../utils/normalizeUrl';
import { generateAuthCode } from '../utils/generateAuthCode';
import { AuthCodesRepository } from './repository/authCodes.repository';
import { RequestRegisterDto } from './dto/request-register.dto';

@Injectable()
export class OauthService {
  constructor(
    private readonly oauthClientRepository: OAuthClientRepository,
    private readonly auditLogsRepository: AuditLogsRepository,
    private readonly authCodesRepository: AuthCodesRepository,
    private readonly configService: ConfigService,
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
    body: CreateAuthorizationCodeInput;
  }) {
    const client = await this.oauthClientRepository.findOne(body.clientId);

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const normalizedRedirectUri = normalizeUrlFunction(body.redirectUri);

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

    const authCodeInput: CreateAuthorizationCodeInput = {
      code: authCode,
      userId: body.userId,
      clientId: client.clientId,
      codeChallenge: body.codeChallenge ?? null, // ChatGPT는 PKCE 미지원
      codeChallengeMethod:
        body.codeChallengeMethod ?? (body.codeChallenge ? 'S256' : null),
      redirectUri: body.redirectUri,
      scope: body.scope ?? 'claudeai',
      state: body.state ?? null,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    };

    await this.authCodesRepository.create(authCodeInput);

    await this.auditLogsRepository.create({
      eventType: 'authorization_granted',
      clientId: client.clientId,
      userId: body.userId,
      ipAddress: ip,
      userAgent: userAgent,
    });

    const redirectUrl = new URL(body.redirectUri);
    redirectUrl.searchParams.set('code', authCode);
    redirectUrl.searchParams.set('state', body.state || '');

    return redirectUrl.toString();
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

import { AuditLogsRepository } from './repository/auditLogs.repository';
import { OAuthClientRepository } from './repository/oauthClient.repository';
import {
  AuditLogEntryInput,
  CreateOAuthClientInput,
} from './types/oauth.types';
import { normalizeUrlFunction } from '../utils/normalizeUrl';
import { generateAuthCode } from '../utils/generateAuthCode';
import { AuthCodesRepository } from './repository/authCodes.repository';
import { RequestRegisterDto } from './dto/request-register.dto';
import { PostAuthorizeDto } from './dto/post-authorize.dto';

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
}

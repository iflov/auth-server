import { Controller, Post, Ip, Headers, Redirect } from '@nestjs/common';
import { Body } from '@nestjs/common';

import { OauthService } from './oauth.service';
import {
  CreateAuthorizationCodeInput,
  CreateOAuthClientInput,
} from './types/oauth.types';

@Controller('oauth')
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  @Post('register')
  async register(
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Body() body: CreateOAuthClientInput,
  ) {
    return this.oauthService.register({ ip, userAgent, oauthClient: body });
  }

  @Post('authorize')
  @Redirect(undefined, 302)
  async authorize(
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Body() body: CreateAuthorizationCodeInput,
  ) {
    const redirectUrl = await this.oauthService.authorize({
      ip,
      userAgent,
      body,
    });
    return { url: redirectUrl };
  }
}

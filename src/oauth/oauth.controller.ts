import {
  Controller,
  Post,
  Ip,
  Headers,
  Redirect,
  Get,
  UseFilters,
  Query,
  Header,
  UseGuards,
} from '@nestjs/common';
import { Body } from '@nestjs/common';

import { OauthService } from './oauth.service';
import { RequestRegisterDto } from './dto/request-register.dto';
import { PostAuthorizeDto } from './dto/post-authorize.dto';
import { GetAuthorizeDto } from './dto/get-authorize.dto';
import { OAuthValidationExceptionFilter } from './filters/oauth-validation.filter';
import { OAuthUnauthorizedFilter } from './filters/oauth-unauthorized.filter';
import { ClientAuthGuard, ClientAuthInfo } from './guards/client-auth.guard';
import { ClientAuth } from './decorators/client-auth.decorator';
import { TokenRequestDto } from './dto/post-token.dto';

@Controller('oauth')
@UseFilters(OAuthUnauthorizedFilter) // Apply OAuth 401 filter to all routes
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  @Post('register')
  async register(
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Body() body: RequestRegisterDto,
  ) {
    return this.oauthService.register({ ip, userAgent, oauthClient: body });
  }

  @Post('authorize')
  @UseFilters(OAuthValidationExceptionFilter)
  @Redirect(undefined, 302)
  async authorize(
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Body() body: PostAuthorizeDto,
  ) {
    const redirectUrl = await this.oauthService.authorize({
      ip,
      userAgent,
      body,
    });
    return { url: redirectUrl };
  }

  @Get('authorize')
  @UseFilters(OAuthValidationExceptionFilter)
  @Header('Content-Type', 'text/html')
  async getAuthorize(@Query() query: GetAuthorizeDto) {
    // Query 파라미터 validation은 자동으로 처리되고,
    // 실패 시 OAuthValidationExceptionFilter가 HTML 에러 페이지를 렌더링

    // 인증 페이지 렌더링
    const authorizeHtml = await this.oauthService.renderAuthorizePage({
      client_id: query.client_id,
      redirect_uri: query.redirect_uri,
      response_type: query.response_type,
      scope: query.scope,
      state: query.state,
      code_challenge: query.code_challenge,
      code_challenge_method: query.code_challenge_method,
    });

    // NestJS가 자동으로 Content-Type을 설정합니다
    return authorizeHtml;
  }

  @Post('token')
  @UseGuards(ClientAuthGuard)
  async token(
    @ClientAuth() clientAuth: ClientAuthInfo,
    @Body() body: TokenRequestDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    // clientAuth로 인증된 클라이언트 정보 사용
    console.log('Client:', clientAuth.clientId);

    return this.oauthService.exchangeToken(
      {
        ...body,
        clientId: clientAuth.clientId,
        isAuthenticated: clientAuth.authenticated,
      },
      ip,
      userAgent,
    );
  }
}

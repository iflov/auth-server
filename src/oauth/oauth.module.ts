import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { OauthController } from './oauth.controller';
import { OauthService } from './oauth.service';
import { OAuthClientRepository } from './repository/oauthClient.repository';
import { AuditLogsRepository } from './repository/auditLogs.repository';
import { AuthCodesRepository } from './repository/authCodes.repository';
import { RefreshTokenRepository } from './repository/refreshToken.repository';
import { AccessTokenRepository } from './repository/accessToken.repository';
import { UserRepository } from './repository/user.repository';
import { ClientAuthGuard } from './guards/client-auth.guard';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtSecret', 'your-secret-key'),
        signOptions: {
          expiresIn: configService.get<string>('auth.accessTokenExpiry', '1h'),
          issuer: configService.get<string>('auth.issuer', 'oauth-server'),
          audience: configService.get<string>('auth.audience', 'oauth-client'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [OauthController],
  providers: [
    OauthService,
    OAuthClientRepository,
    AuditLogsRepository,
    AuthCodesRepository,
    RefreshTokenRepository,
    AccessTokenRepository,
    UserRepository,
    ClientAuthGuard,
  ],
  exports: [OauthService, ClientAuthGuard],
})
export class OauthModule {}

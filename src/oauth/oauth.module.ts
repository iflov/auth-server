import { Module } from '@nestjs/common';

import { OauthController } from './oauth.controller';
import { OauthService } from './oauth.service';
import { OAuthClientRepository } from './repository/oauthClient.repository';
import { AuditLogsRepository } from './repository/auditLogs.repository';
import { AuthCodesRepository } from './repository/authCodes.repository';

@Module({
  controllers: [OauthController],
  providers: [
    OauthService,
    OAuthClientRepository,
    AuditLogsRepository,
    AuthCodesRepository,
  ],
  exports: [],
})
export class OauthModule {}

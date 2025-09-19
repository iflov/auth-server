import { Module } from '@nestjs/common';

import { OauthController } from './oauth.controller';
import { OauthService } from './oauth.service';
import { OAuthClientRepository } from './repository/oauthClient.repository';
import { AuditLogsRepository } from './repository/auditLogs.repository';

@Module({
  controllers: [OauthController],
  providers: [OauthService, OAuthClientRepository, AuditLogsRepository],
  exports: [],
})
export class OauthModule {}

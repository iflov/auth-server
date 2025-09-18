import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { OauthModule } from './oauth/oauth.module';
import { databaseConfig, appConfig, authConfig } from './config';
import { WellknownModule } from './wellknown/wellknown.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig, authConfig], // 모든 설정 모듈 로드
      envFilePath: '.env',
      cache: true, // 설정값 캐싱 활성화
      expandVariables: true, // ${VAR} 형식의 변수 확장 지원
    }),
    CommonModule, // Common module with middleware
    DatabaseModule,
    OauthModule,
    WellknownModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

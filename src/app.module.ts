import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OauthModule } from './oauth/oauth.module';
import { DatabaseModule } from './database/database.module';
import { databaseConfig, appConfig, authConfig } from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig, authConfig], // 모든 설정 모듈 로드
      envFilePath: '.env',
      cache: true, // 설정값 캐싱 활성화
      expandVariables: true, // ${VAR} 형식의 변수 확장 지원
    }),
    DatabaseModule,
    OauthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

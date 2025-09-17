import { Module, Global } from '@nestjs/common';
import { DrizzleService } from './drizzle.service';

/**
 * DatabaseModule - 데이터베이스 모듈
 *
 * @Global() 데코레이터를 사용하여 전역 모듈로 설정
 * 다른 모듈에서 DatabaseModule을 import하지 않아도 DrizzleService를 주입받을 수 있습니다.
 */
@Global()
@Module({
  // 이 모듈에서 제공하는 서비스 목록
  providers: [DrizzleService],
  // 다른 모듈에서 사용할 수 있도록 내보내는 서비스 목록
  exports: [DrizzleService],
})
export class DatabaseModule {}

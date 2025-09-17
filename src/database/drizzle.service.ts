import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

/**
 * DrizzleService - 데이터베이스 연결 및 관리를 담당하는 서비스
 *
 * Drizzle ORM과 PostgreSQL 연결 풀을 관리하며,
 * NestJS 생명주기 훅을 사용해 모듈 초기화/종료 시 DB 연결을 자동으로 관리합니다.
 */
@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  // 로거 인스턴스 - 데이터베이스 관련 로그 출력용
  private readonly logger = new Logger(DrizzleService.name);
  // PostgreSQL 연결 풀 - 여러 개의 DB 연결을 효율적으로 관리
  private pool: Pool;
  // Drizzle ORM 인스턴스 - 타입 안전한 쿼리 작성을 위한 ORM
  private db: NodePgDatabase<typeof schema>;

  // ConfigService를 주입받아 환경 설정 값에 접근
  constructor(private readonly configService: ConfigService) {}

  /**
   * 모듈 초기화 시 자동으로 호출되는 생명주기 메서드
   * 데이터베이스 연결을 설정하고 초기화합니다.
   */
  async onModuleInit() {
    try {
      // 데이터베이스 연결 설정 객체 생성
      const dbConfig = {
        // 환경변수에서 DB 호스트 가져오기 (기본값: localhost)
        host: this.configService.get<string>('database.host', 'localhost'),
        // 환경변수에서 DB 포트 가져오기 (기본값: 5432)
        port: this.configService.get<number>('database.port', 5432),
        // 환경변수에서 DB 이름 가져오기 (기본값: mcp_poc)
        database: this.configService.get<string>(
          'database.database',
          'mcp_poc',
        ),
        // 환경변수에서 DB 사용자명 가져오기 (기본값: postgres)
        user: this.configService.get<string>('database.user', 'postgres'),
        // 환경변수에서 DB 비밀번호 가져오기 (기본값: postgres)
        password: this.configService.get<string>(
          'database.password',
          'postgres',
        ),
        // 커넥션 풀 최대 연결 수 (기본값: 10개)
        max: this.configService.get<number>('database.poolSize', 10),
        // 유휴 연결 타임아웃 시간 (기본값: 30초)
        idleTimeoutMillis: this.configService.get<number>(
          'database.idleTimeoutMillis',
          30000,
        ),
        // 연결 시도 타임아웃 시간 (기본값: 2초)
        connectionTimeoutMillis: this.configService.get<number>(
          'database.connectionTimeoutMillis',
          2000,
        ),
      };

      // SSL 설정이 활성화되어 있으면 SSL 옵션 추가
      const sslEnabled = this.configService.get<boolean>('database.ssl', false);
      if (sslEnabled) {
        Object.assign(dbConfig, {
          ssl: { rejectUnauthorized: false },
        });
      }

      // PostgreSQL 연결 풀 생성
      this.pool = new Pool(dbConfig);
      // Drizzle ORM 인스턴스 생성 (스키마 정보와 함께)
      this.db = drizzle(this.pool, { schema });

      // 연결 테스트 - SELECT 1 쿼리로 연결 상태 확인
      await this.pool.query('SELECT 1');
      // 연결 성공 로그
      this.logger.log(
        `Database connected successfully to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
      );
    } catch (error) {
      // 연결 실패 시 에러 로그 출력 후 에러 재발생
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  /**
   * 모듈 종료 시 자동으로 호출되는 생명주기 메서드
   * 데이터베이스 연결을 안전하게 종료합니다.
   */
  async onModuleDestroy() {
    try {
      // 연결 풀의 모든 연결 종료
      await this.pool.end();
      this.logger.log('Database connection closed');
    } catch (error) {
      this.logger.error('Error closing database connection', error);
    }
  }

  /**
   * Drizzle ORM 인스턴스를 반환하는 메서드
   * 다른 서비스에서 DB 쿼리를 실행할 때 사용
   */
  getDb(): NodePgDatabase<typeof schema> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * PostgreSQL 연결 풀을 반환하는 메서드
   * 낮은 수준의 쿼리나 특별한 작업이 필요할 때 사용
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool;
  }

  /**
   * 트랜잭션을 실행하는 헬퍼 메서드
   * 여러 DB 작업을 하나의 트랜잭션으로 묶어 실행할 때 사용
   *
   * @param callback - 트랜잭션 내에서 실행할 비즈니스 로직
   * @returns 트랜잭션 실행 결과
   */
  async transaction<T>(
    callback: (tx: NodePgDatabase<typeof schema>) => Promise<T>,
  ): Promise<T> {
    return await this.db.transaction(callback);
  }
}

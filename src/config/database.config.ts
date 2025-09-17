import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

/**
 * 데이터베이스 설정 모듈
 *
 * registerAs를 사용하여 'database' 네임스페이스로 설정을 등록합니다.
 * ConfigService에서 'database.host'와 같은 형식으로 접근 가능합니다.
 * Joi를 사용하여 런타임 환경변수 검증을 수행합니다.
 */
export default registerAs('database', () => {
  // 환경변수에서 설정값 읽기
  const config = {
    // 데이터베이스 호스트 (Docker 사용 시 컨테이너명, 로컬은 localhost)
    host: process.env.POSTGRES_HOST || 'localhost',

    // 데이터베이스 포트 (PostgreSQL 기본 포트: 5432)
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),

    // 데이터베이스 이름
    database: process.env.POSTGRES_DB || 'mcp_poc',

    // 데이터베이스 사용자명
    user: process.env.POSTGRES_USER || 'postgres',

    // 데이터베이스 비밀번호
    password: process.env.POSTGRES_PASSWORD || 'postgres',

    // 커넥션 풀 설정
    // 동시에 유지할 최대 연결 수 (기본값: 10)
    poolSize: parseInt(process.env.POSTGRES_POOL_SIZE || '10', 10),

    // 유휴 연결이 자동으로 닫히기까지 대기 시간 (밀리초, 기본값: 30초)
    idleTimeoutMillis: parseInt(
      process.env.POSTGRES_IDLE_TIMEOUT || '30000',
      10,
    ),

    // DB 연결 시도 타임아웃 (밀리초, 기본값: 2초)
    connectionTimeoutMillis: parseInt(
      process.env.POSTGRES_CONNECTION_TIMEOUT || '2000',
      10,
    ),

    // SSL 연결 설정
    // 프로덕션 환경에서는 true로 설정하여 보안 연결 사용
    ssl: process.env.POSTGRES_SSL === 'true',

    // Drizzle Kit 등 CLI 도구에서 사용할 연결 URL
    // DATABASE_URL이 설정되어 있으면 해당 값 사용, 없으면 개별 설정값으로 URL 생성
    url:
      process.env.DATABASE_URL ||
      `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`,
  };

  // Joi 검증 스키마 정의
  const schema = Joi.object({
    host: Joi.string()
      .hostname()
      .required()
      .description('데이터베이스 호스트 주소'),

    port: Joi.number()
      .port()
      .required()
      .description('데이터베이스 포트 번호 (1-65535)'),

    database: Joi.string().min(1).required().description('데이터베이스 이름'),

    user: Joi.string().min(1).required().description('데이터베이스 사용자명'),

    password: Joi.string()
      .min(1)
      .required()
      .description('데이터베이스 비밀번호'),

    poolSize: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .required()
      .description('커넥션 풀 최대 연결 수'),

    idleTimeoutMillis: Joi.number()
      .integer()
      .min(1000)
      .required()
      .description('유휴 연결 타임아웃 (최소 1초)'),

    connectionTimeoutMillis: Joi.number()
      .integer()
      .min(500)
      .required()
      .description('연결 시도 타임아웃 (최소 500ms)'),

    ssl: Joi.boolean().required().description('SSL 연결 사용 여부'),

    url: Joi.string()
      .uri({ scheme: ['postgresql', 'postgres'] })
      .required()
      .description('데이터베이스 연결 URL'),
  });

  // 설정값 검증 실행
  const { error, value } = schema.validate(config, {
    abortEarly: false, // 모든 오류를 한번에 표시
    allowUnknown: false, // 정의되지 않은 필드 허용 안함
  });

  // 검증 실패 시 상세한 에러 메시지와 함께 앱 종료
  if (error) {
    const errors = error.details
      .map((detail) => `  - ${detail.path.join('.')}: ${detail.message}`)
      .join('\n');

    throw new Error(
      `\n🚨 데이터베이스 설정 검증 실패:\n${errors}\n\n` +
        `💡 .env 파일을 확인하고 필요한 환경변수를 설정해주세요.`,
    );
  }

  return value;
});

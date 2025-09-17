import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

/**
 * 애플리케이션 설정 모듈
 *
 * 애플리케이션 전반적인 설정을 관리합니다.
 * 환경 설정, 로깅, API 설정 등을 포함합니다.
 */
export default registerAs('app', () => {
  // 환경변수에서 설정값 읽기
  const config = {
    // 애플리케이션 실행 환경
    nodeEnv: process.env.NODE_ENV || 'development',

    // 로그 레벨
    logLevel: process.env.LOG_LEVEL || 'debug',

    // 로그 출력 형식
    logFormat: process.env.LOG_FORMAT || 'json',

    // API 서버 설정
    host: process.env.AUTH_SERVER_HOST || 'localhost',
    port: parseInt(process.env.AUTH_SERVER_PORT || '3001', 10),
    url: process.env.AUTH_SERVER_URL || 'http://localhost:3001',

    // API 라우트 prefix
    apiPrefix: process.env.API_PREFIX || 'api',

    // CORS 설정
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
      : ['http://localhost:3000', 'http://localhost:3001'],

    // Rate Limiting 설정
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 기본 15분
    rateLimitMaxRequests: parseInt(
      process.env.RATE_LIMIT_MAX_REQUESTS || '100',
      10,
    ),
  };

  // Joi 검증 스키마 정의
  const schema = Joi.object({
    nodeEnv: Joi.string()
      .valid('development', 'production', 'test', 'staging')
      .required()
      .description('애플리케이션 실행 환경'),

    logLevel: Joi.string()
      .valid('error', 'warn', 'info', 'verbose', 'debug', 'silly')
      .required()
      .description('로그 레벨'),

    logFormat: Joi.string()
      .valid('json', 'text', 'pretty')
      .required()
      .description('로그 출력 형식'),

    host: Joi.string().hostname().required().description('서버 호스트'),

    port: Joi.number().port().required().description('서버 포트'),

    url: Joi.string().uri().required().description('서버 전체 URL'),

    apiPrefix: Joi.string()
      .alphanum()
      .min(1)
      .required()
      .description('API 라우트 prefix'),

    corsOrigins: Joi.array()
      .items(Joi.string().uri())
      .min(1)
      .required()
      .description('CORS 허용 Origin 목록'),

    rateLimitWindow: Joi.number()
      .integer()
      .min(1000)
      .required()
      .description('Rate limit 시간 윈도우 (밀리초)'),

    rateLimitMaxRequests: Joi.number()
      .integer()
      .min(1)
      .required()
      .description('윈도우당 최대 요청 수'),
  });

  // 설정값 검증 실행
  const { error, value } = schema.validate(config, {
    abortEarly: false,
    allowUnknown: false,
  });

  // 검증 실패 시 에러 발생
  if (error) {
    const errors = error.details
      .map((detail) => `  - ${detail.path.join('.')}: ${detail.message}`)
      .join('\n');

    throw new Error(
      `\n🚨 애플리케이션 설정 검증 실패:\n${errors}\n\n` +
        `💡 .env 파일을 확인하고 필요한 환경변수를 설정해주세요.`,
    );
  }

  return value;
});

import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

/**
 * 인증/인가 설정 모듈
 *
 * OAuth 2.0, JWT, 세션 등 보안 관련 설정을 관리합니다.
 */
export default registerAs('auth', () => {
  // 환경변수에서 설정값 읽기
  const config = {
    // JWT 설정
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    jwtAlgorithm: process.env.JWT_ALGORITHM || 'HS256',

    // JWT 토큰 만료 시간 설정
    accessTokenExpiry: parseInt(
      process.env.JWT_ACCESS_TOKEN_EXPIRY || '3600',
      10,
    ), // 1시간
    refreshTokenExpiry: parseInt(
      process.env.JWT_REFRESH_TOKEN_EXPIRY || '2592000',
      10,
    ), // 30일
    issuer: process.env.JWT_ISSUER || 'oauth-server',
    audience: process.env.JWT_AUDIENCE || 'oauth-client',

    // OAuth 토큰 만료 시간 (초 단위)
    oauthTokenExpiry: parseInt(process.env.OAUTH_TOKEN_EXPIRY || '3600', 10), // 1시간
    oauthRefreshTokenExpiry: parseInt(
      process.env.OAUTH_REFRESH_TOKEN_EXPIRY || '604800',
      10,
    ), // 7일
    oauthCodeExpiry: parseInt(process.env.OAUTH_CODE_EXPIRY || '600', 10), // 10분

    // 암호화 설정
    encryptionKey:
      process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key',
    hashRounds: parseInt(process.env.HASH_ROUNDS || '10', 10),

    // 세션 설정
    sessionSecret:
      process.env.SESSION_SECRET || 'your-session-secret-change-this',
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10), // 24시간
  };

  // Joi 검증 스키마 정의
  const schema = Joi.object({
    jwtSecret: Joi.string()
      .min(32)
      .required()
      .description('JWT 서명용 비밀키 (최소 32자)'),

    jwtAlgorithm: Joi.string()
      .valid('HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512')
      .required()
      .description('JWT 서명 알고리즘'),

    accessTokenExpiry: Joi.number()
      .integer()
      .min(60) // 최소 1분
      .max(86400) // 최대 24시간
      .required()
      .description('JWT 액세스 토큰 만료 시간 (초)'),

    refreshTokenExpiry: Joi.number()
      .integer()
      .min(3600) // 최소 1시간
      .max(31536000) // 최대 1년
      .required()
      .description('JWT 리프레시 토큰 만료 시간 (초)'),

    issuer: Joi.string().required().description('JWT issuer claim'),

    audience: Joi.string().required().description('JWT audience claim'),

    oauthTokenExpiry: Joi.number()
      .integer()
      .min(60) // 최소 1분
      .max(86400) // 최대 24시간
      .required()
      .description('OAuth 액세스 토큰 만료 시간 (초)'),

    oauthRefreshTokenExpiry: Joi.number()
      .integer()
      .min(3600) // 최소 1시간
      .max(2592000) // 최대 30일
      .required()
      .description('OAuth 리프레시 토큰 만료 시간 (초)'),

    oauthCodeExpiry: Joi.number()
      .integer()
      .min(60) // 최소 1분
      .max(3600) // 최대 1시간
      .required()
      .description('OAuth 인가 코드 만료 시간 (초)'),

    encryptionKey: Joi.string()
      .length(32)
      .required()
      .description('데이터 암호화키 (정확히 32자)'),

    hashRounds: Joi.number()
      .integer()
      .min(8)
      .max(20)
      .required()
      .description('bcrypt 해싱 라운드 (8-20)'),

    sessionSecret: Joi.string()
      .min(32)
      .required()
      .description('세션 비밀키 (최소 32자)'),

    sessionMaxAge: Joi.number()
      .integer()
      .min(60000) // 최소 1분
      .max(604800000) // 최대 7일
      .required()
      .description('세션 최대 유지 시간 (밀리초)'),
  });

  // 프로덕션 환경에서 추가 검증
  if (
    config.jwtSecret === 'your-secret-key-change-in-production' &&
    process.env.NODE_ENV === 'production'
  ) {
    throw new Error(
      '🚨 보안 경고: 프로덕션 환경에서 기본 JWT_SECRET을 사용할 수 없습니다!',
    );
  }

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
      `\n🚨 인증 설정 검증 실패:\n${errors}\n\n` +
        `💡 .env 파일을 확인하고 필요한 환경변수를 설정해주세요.`,
    );
  }

  return value;
});

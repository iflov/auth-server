import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// .env 파일에서 환경변수 로드
dotenv.config();

/**
 * Drizzle Kit 설정 파일
 *
 * Drizzle Kit은 마이그레이션 파일 생성, 실행, 스키마 관리를 담당하는 CLI 도구입니다.
 * 이 설정 파일은 데이터베이스 연결 정보와 마이그레이션 관련 옵션을 정의합니다.
 */
export default defineConfig({
  // 스키마 정의 파일 위치
  // 이 파일에서 정의된 테이블 구조를 기반으로 마이그레이션 파일 생성
  schema: './src/database/schema/index.ts',

  // 마이그레이션 파일이 생성될 디렉토리
  out: './drizzle',

  // 사용할 데이터베이스 종류
  dialect: 'postgresql',

  // 데이터베이스 연결 정보
  dbCredentials: {
    // DB 호스트 (Docker 실행 시 'postgres', 로컬 실행 시 'localhost')
    host: process.env.POSTGRES_HOST || 'localhost',

    // DB 포트 번호
    port: parseInt(process.env.POSTGRES_PORT || '5432'),

    // 데이터베이스 이름 (주의: 기본값이 'auth_db'로 다름)
    database: process.env.POSTGRES_DB || 'auth_db',

    // DB 사용자명
    user: process.env.POSTGRES_USER || 'postgres',

    // DB 비밀번호
    password: process.env.POSTGRES_PASSWORD || 'password',

    // SSL 연결 사용 여부 (로컬 개발에서는 false)
    ssl: false,
  },

  // 자세한 로그 출력 여부
  verbose: true,

  // 엄격 모드 - 스키마 타입 체크를 더 엄격하게 수행
  strict: true,
});

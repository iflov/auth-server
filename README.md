# Auth Server

NestJS 기반 OAuth 2.1 인증 서버입니다. Universal MCP 환경에서 사용자를 대신해 클라이언트 애플리케이션과 토큰을 주고받는 역할을 하며, PostgreSQL + Drizzle ORM, JWT, PKCE, 감사 로그 등을 지원합니다.

## 주요 기능
- **OAuth 2.1 엔드포인트**: 클라이언트 등록, 인가 코드 발급, 토큰 교환, 리프레시, 인트로스펙션, 토큰 무효화 제공
- **PKCE 지원**: 공개 클라이언트도 안전하게 인가 코드를 교환할 수 있도록 S256 챌린지 검증
- **JWT 기반 토큰**: Access/Refresh 토큰을 JWT로 발급하고 만료·감사 정보를 PostgreSQL에 저장
- **Drizzle ORM + 마이그레이션**: `drizzle-kit`으로 스키마 관리 및 마이그레이션 실행
- **스네이크 케이스 응답**: JSON 응답을 OAuth 스펙에 맞게 전역 인터셉터로 snake_case로 변환
- **템플릿 기반 승인 화면**: `/oauth/authorize` GET 요청 시 HTML 템플릿(`templates/authorize.html`) 제공
- **Well-Known 메타데이터**: `.well-known/oauth-authorization-server` 엔드포인트로 클라이언트 구성이 가능한 메타 정보 노출

## 디렉터리 구조
```
src/
 ├─ app.controller.ts      # Health 등 기본 엔드포인트
 ├─ oauth/                 # OAuth 모듈 (컨트롤러, 서비스, DTO, 가드, 리포지토리)
 ├─ database/              # Drizzle 초기화, 스키마, 리포지토리 정의
 ├─ common/                # 공통 필터, 인터셉터 등
 ├─ wellknown/             # /.well-known/oauth-authorization-server 컨트롤러
 └─ templates/authorize.html  # 승인 화면 템플릿
```

## 요구 사항
- Node.js 20+
- pnpm 8+
- PostgreSQL 15+ (또는 Docker Compose)
- Docker/Docker Compose (선택)

## 설치 및 실행 (로컬)
```bash
pnpm install                # 의존성 설치
cp .env.example .env        # 환경 파일 복사 및 수정 (이미 .env가 있다면 값만 확인)

# 데이터베이스 마이그레이션 (로컬 DB 사용 시)
pnpm run migration:push

# 개발 서버 실행 (기본 포트 3001)
pnpm run start:dev
```
- Health 체크: `GET http://localhost:3001/health`
- OAuth 메타데이터: `GET http://localhost:3001/.well-known/oauth-authorization-server`

### 데이터베이스 마이그레이션
drizle-kit 명령을 npm 스크립트로 제공합니다.

| 목적 | 명령 |
|------|------|
| 마이그레이션 생성 | `pnpm run migration:generate` |
| 마이그레이션 실행 | `pnpm run migration:run` |
| 로컬 DB에 적용 | `pnpm run migration:local` |
| Drizzle Studio | `pnpm run migration:studio` |

마이그레이션 파일은 `drizzle/` 폴더에 저장되며, 스냅샷은 `drizzle/meta/`에 기록됩니다.

## Docker Compose 실행
PostgreSQL과 인증 서버를 함께 띄우려면 다음 명령을 사용합니다.

```bash
# 백그라운드 실행
docker compose up -d

# 로그 확인
docker compose logs -f auth-server

# 중지
docker compose down
```

Docker 빌드 시 `.env` 값이 그대로 사용되므로, 포트/계정 정보는 반드시 변경하세요.

## 주요 OAuth 엔드포인트
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/oauth/register` | 클라이언트 등록 (client_id/client_secret 발급) |
| GET | `/oauth/authorize` | HTML 승인 화면 렌더링 |
| POST | `/oauth/authorize` | 인가 코드 발급 (302 리다이렉트) |
| POST | `/oauth/token` | 인가 코드 → 액세스 토큰 교환 / 리프레시 토큰 교환 |
| POST | `/oauth/introspect` | 토큰 유효성 검사 |
| POST | `/oauth/revoke` | 액세스/리프레시 토큰 무효화 |
| GET | `/.well-known/oauth-authorization-server` | OAuth 서버 메타데이터 |

응답 본문은 전역 인터셉터를 통해 snake_case로 변환됩니다. PKCE 검증을 사용하므로 공개 클라이언트는 `code_verifier`를 반드시 전달해야 합니다.

## Postman으로 흐름 테스트하기
`postman-collection.json`에 전체 시나리오가 담겨 있습니다.
1. 컬렉션 임포트 후 Collection Variables에서 `baseUrl`, `userId`, `codeChallenge`, `codeVerifier` 등을 확인합니다.
2. **Submit Authorization** 요청의 Settings에서 “Automatically follow redirects” 옵션을 꺼야 302 응답의 `code` 값을 스크립트가 저장할 수 있습니다.
3. 요청 순서: `Register Client` → `Submit Authorization` → `Exchange Code for Token` → `Refresh Token` → `Introspect` → `Revoke`.
4. Postman 콘솔(View → Show Postman Console)을 열면 각 단계에서 저장된 변수 로그를 확인할 수 있습니다.

## 환경 변수 개요
`.env`에 기본 값이 정의되어 있으며 주요 항목은 다음과 같습니다.

| 변수 | 설명 |
|------|------|
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | 데이터베이스 연결 설정 |
| `DATABASE_URL` | Drizzle 마이그레이션용 데이터베이스 URL |
| `AUTH_SERVER_PORT` | Nest 서버 포트 (기본 3001) |
| `CORS_ORIGINS` | 허용할 오리진 목록 |
| `JWT_SECRET`, `JWT_ACCESS_TOKEN_EXPIRY`, `JWT_REFRESH_TOKEN_EXPIRY` | 토큰 서명/만료 설정 |
| `OAUTH_CODE_EXPIRY`, `OAUTH_TOKEN_EXPIRY`, `OAUTH_REFRESH_TOKEN_EXPIRY` | 인가 코드/토큰 만료 시간 |

필요에 따라 Rate Limiting, Redis, Email 관련 설정도 확장할 수 있습니다.

## 유용한 npm 스크립트
| 명령 | 설명 |
|------|------|
| `pnpm run start` | 프로덕션 모드 실행 (빌드 필요) |
| `pnpm run start:dev` | 개발 모드 (watch) |
| `pnpm run build` | Nest 빌드 |
| `pnpm run test` | 유닛 테스트 실행 |
| `pnpm run lint` | ESLint 검사 및 자동 수정 |
| `pnpm run format` | Prettier 포맷팅 |
| `pnpm run up` | `docker-compose up -d` (Postgres + Auth 서버) |
| `pnpm run down` | `docker-compose down` |

## 개발 메모
- PostgreSQL 연결이 성공하면 Drizzle을 통해 감사 로그, 토큰, 사용자 테이블이 자동으로 관리됩니다.
- 승인 화면은 `templates/authorize.html`을 원하는 UI로 자유롭게 수정할 수 있습니다.
- 토큰 발급 시 JWT 페이로드에 `exp`를 직접 추가하지 말고, `expiresIn` 옵션을 사용해 jsonwebtoken 경고를 피하도록 구현되어 있습니다.
- JSON 응답은 snake_case이지만, 내부 TypeScript 코드에서는 camelCase를 그대로 사용하며 인터셉터가 변환합니다.

## 라이선스
본 저장소는 사내 프로젝트로 사용하며 공개 라이선스가 지정되어 있지 않습니다 (`UNLICENSED`).

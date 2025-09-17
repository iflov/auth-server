CREATE TYPE "public"."execution_status" AS ENUM('success', 'failure', 'in_progress');--> statement-breakpoint
CREATE TYPE "public"."token_status" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."whitelist_type" AS ENUM('package', 'domain');--> statement-breakpoint
CREATE TABLE "access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(512) NOT NULL,
	"jti" varchar(255),
	"user_id" uuid NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"scope" text DEFAULT 'openid profile email',
	"status" "token_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "access_tokens_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "access_tokens_jti_unique" UNIQUE("jti")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"entity_type" varchar(100),
	"entity_id" varchar(255),
	"user_id" uuid,
	"client_id" varchar(255),
	"ip_address" "inet",
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(512) NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"code_challenge" varchar(512),
	"code_challenge_method" varchar(10) DEFAULT 'S256',
	"redirect_uri" text NOT NULL,
	"scope" text DEFAULT 'openid profile email',
	"state" text,
	"nonce" text,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "auth_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "execution_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"user_id" uuid,
	"client_id" varchar(255),
	"tool_name" varchar(255) NOT NULL,
	"args" jsonb,
	"result" jsonb,
	"status" "execution_status" DEFAULT 'in_progress' NOT NULL,
	"execution_time" integer,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oauth_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"client_secret" varchar(512),
	"client_name" varchar(255) NOT NULL,
	"description" text,
	"redirect_uris" text[] NOT NULL,
	"grant_types" text[] DEFAULT '{"authorization_code","refresh_token"}',
	"response_types" text[] DEFAULT '{"code"}',
	"scope" text DEFAULT 'openid profile email',
	"token_endpoint_auth_method" varchar(50) DEFAULT 'client_secret_basic',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_clients_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"refresh_token" varchar(512) NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"scope" text DEFAULT 'openid profile email',
	"family" varchar(255),
	"status" "token_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "refresh_tokens_refresh_token_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token" varchar(512) NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"device_info" jsonb,
	"last_activity_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(255),
	"password_hash" varchar(255),
	"name" varchar(255),
	"avatar_url" text,
	"phone_number" varchar(50),
	"email_verified" boolean DEFAULT false,
	"email_verified_at" timestamp with time zone,
	"phone_verified" boolean DEFAULT false,
	"two_factor_enabled" boolean DEFAULT false,
	"two_factor_secret" text,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"role" varchar(50) DEFAULT 'user',
	"metadata" jsonb,
	"preferences" jsonb,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "whitelist" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "whitelist_type" NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"reason" text,
	"blocked_versions" text[],
	"allowed_versions" text[],
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"approved_by" uuid,
	"approval_date" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_access_tokens_hash" ON "access_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_access_tokens_user_id" ON "access_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_access_tokens_expires_at" ON "access_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_access_tokens_status" ON "access_tokens" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_event_type" ON "audit_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_auth_codes_code" ON "auth_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_auth_codes_user_id" ON "auth_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_auth_codes_expires_at" ON "auth_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_execution_history_session_id" ON "execution_history" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_execution_history_tool_name" ON "execution_history" USING btree ("tool_name");--> statement-breakpoint
CREATE INDEX "idx_execution_history_status" ON "execution_history" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_execution_history_user_id" ON "execution_history" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_oauth_clients_client_id" ON "oauth_clients" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_clients_is_active" ON "oauth_clients" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_refresh_tokens_token" ON "refresh_tokens" USING btree ("refresh_token");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_client_id" ON "refresh_tokens" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_status" ON "refresh_tokens" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_user_id" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_sessions_token" ON "user_sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_expires_at" ON "user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_username" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_users_status" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_whitelist_type_name" ON "whitelist" USING btree ("type","name");--> statement-breakpoint
CREATE INDEX "idx_whitelist_is_active" ON "whitelist" USING btree ("is_active");
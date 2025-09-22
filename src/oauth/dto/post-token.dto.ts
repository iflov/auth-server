import { IsString, IsOptional, IsIn, ValidateIf } from 'class-validator';

export class TokenRequestDto {
  @IsString()
  @IsIn(['authorization_code', 'refresh_token'])
  grant_type: string;

  // For authorization_code grant type
  @ValidateIf((o) => o.grant_type === 'authorization_code')
  @IsString()
  code?: string;

  @ValidateIf((o) => o.grant_type === 'authorization_code')
  @IsString()
  redirect_uri?: string;

  // PKCE code_verifier (required for public clients, optional for confidential clients)
  @IsOptional()
  @IsString()
  code_verifier?: string;

  // For refresh_token grant type
  @ValidateIf((o) => o.grant_type === 'refresh_token')
  @IsString()
  refresh_token?: string;

  // Client credentials (for public clients that don't use HTTP Basic Auth)
  @IsOptional()
  @IsString()
  client_id?: string;

  @IsOptional()
  @IsString()
  client_secret?: string;

  // Optional scope parameter
  @IsOptional()
  @IsString()
  scope?: string;
}

import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class RequestRegisterDto {
  @IsString()
  @IsNotEmpty()
  client_name: string;

  @IsArray()
  @IsNotEmpty()
  redirect_uris: string[];

  @IsArray()
  @IsNotEmpty()
  grant_types: string[];

  @IsArray()
  @IsNotEmpty()
  response_types: string[];

  @IsString()
  @IsNotEmpty()
  token_endpoint_auth_method: string;

  @IsString()
  @IsOptional()
  scope?: string;
}

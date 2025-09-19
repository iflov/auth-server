import { IsString, IsNotEmpty, IsArray } from 'class-validator';

export class RequestRegisterDto {
  @IsString()
  @IsNotEmpty()
  client_id: string;

  @IsString()
  @IsNotEmpty()
  client_secret: string;

  @IsString()
  @IsNotEmpty()
  client_name: string;

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
  @IsNotEmpty()
  scope: string;

  @IsArray()
  @IsNotEmpty()
  redirect_uris: string[];
}

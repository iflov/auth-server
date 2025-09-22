import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PostIntrospectDto {
  @IsNotEmpty({ message: 'token is required' })
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  token_type_hint?: string;
}

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsIn,
  Validate,
} from 'class-validator';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'validateRedirectUri', async: false })
export class ValidateRedirectUri implements ValidatorConstraintInterface {
  validate(redirectUri: string) {
    if (!redirectUri) return false;

    try {
      const url = new URL(redirectUri);

      // localhost는 HTTP 허용, 그 외는 HTTPS 필수
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return true;
      }

      return url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return 'redirect_uri must use HTTPS (except for localhost)';
  }
}

export class PostAuthorizeDto {
  @IsNotEmpty({ message: 'user_id is required' })
  @IsString()
  user_id: string;

  @IsNotEmpty({ message: 'client_id is required' })
  @IsString()
  client_id: string;

  @IsNotEmpty({ message: 'redirect_uri is required' })
  @IsUrl({}, { message: 'redirect_uri must be a valid URL' })
  @Validate(ValidateRedirectUri)
  redirect_uri: string;

  @IsOptional()
  @IsString()
  code_challenge?: string; // ChatGPT는 PKCE 지원 안함 - 선택사항으로 변경

  @IsOptional()
  @IsIn(['S256'])
  code_challenge_method?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  state?: string;
}

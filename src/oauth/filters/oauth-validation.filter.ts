import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Catch(BadRequestException)
export class OAuthValidationExceptionFilter implements ExceptionFilter {
  private templateCache: string | null = null;

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const exceptionResponse = exception.getResponse() as any;

    // OAuth authorize 엔드포인트 확인
    const isOAuthAuthorize =
      request.path?.includes('/oauth/authorize') &&
      (request.method === 'GET' || request.method === 'POST');

    if (!isOAuthAuthorize) {
      // 다른 엔드포인트는 기본 JSON 응답 처리
      response.status(exception.getStatus()).json(exceptionResponse);
      return;
    }

    // Validation 에러 메시지 추출
    let errorDescription = 'Invalid authorization request.';

    if (exceptionResponse.message) {
      errorDescription = Array.isArray(exceptionResponse.message)
        ? exceptionResponse.message.join(', ')
        : exceptionResponse.message;
    }

    console.log('Validation errors:', errorDescription);

    // 에러 HTML 렌더링
    const errorHtml = this.renderErrorTemplate({
      ERROR_CODE: 'invalid_request',
      ERROR_MESSAGE: 'Invalid authorization request.',
      ERROR_DESCRIPTION: errorDescription,
    });

    // HTML 응답 전송
    response.status(HttpStatus.BAD_REQUEST).type('html').send(errorHtml);
  }

  private renderErrorTemplate(data: {
    ERROR_CODE: string;
    ERROR_MESSAGE: string;
    ERROR_DESCRIPTION: string;
  }): string {
    try {
      // 템플릿 캐싱
      if (!this.templateCache) {
        const templatePath = path.join(
          process.cwd(),
          'templates',
          'error.html',
        );

        if (!fs.existsSync(templatePath)) {
          throw new Error(`Template file not found: ${templatePath}`);
        }

        this.templateCache = fs.readFileSync(templatePath, 'utf-8');
      }

      // 간단한 템플릿 치환
      let html = this.templateCache;
      Object.keys(data).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, data[key]);
      });

      return html;
    } catch (error) {
      console.error('Error rendering template:', error);
      // 템플릿 파일이 없으면 최소한의 fallback HTML 반환
      // 실제 운영 환경에서는 error.html이 항상 있어야 함
      return this.getDefaultErrorHtml(data);
    }
  }

  private getDefaultErrorHtml(data: {
    ERROR_CODE: string;
    ERROR_MESSAGE: string;
    ERROR_DESCRIPTION: string;
  }): string {
    // 간단한 fallback HTML (템플릿 파일이 없을 때만 사용)
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Authorization Error</title>
      </head>
      <body>
          <h1>Authorization Error</h1>
          <p>Error Code: ${data.ERROR_CODE}</p>
          <p>${data.ERROR_MESSAGE}</p>
          <p>Details: ${data.ERROR_DESCRIPTION}</p>
          <a href="javascript:history.back()">Go Back</a>
      </body>
      </html>
    `;
  }
}

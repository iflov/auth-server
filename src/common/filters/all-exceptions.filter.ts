import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface OAuthError {
  error: string;
  error_description: string;
  error_uri?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: any = {};

    // Handle HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        message = (exceptionResponse as any).message || message;
        error = (exceptionResponse as any).error || {};
      }
    }
    // Handle database and other errors
    else if (exception instanceof Error) {
      message = exception.message;

      // Database connection error
      if ((exception as any).code === 'ECONNREFUSED') {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'Database connection failed';
      }
      // PostgreSQL unique violation
      else if ((exception as any).code === '23505') {
        status = HttpStatus.CONFLICT;
        message = 'Resource already exists';
      }
      // Validation Error
      else if (exception.name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Validation Error';
      }
      // Unauthorized Error
      else if (exception.name === 'UnauthorizedError') {
        status = HttpStatus.UNAUTHORIZED;
        message = 'Unauthorized';
      }
    }

    // Log the error
    this.logger.error(
      `Error ${status} on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception,
    );

    // OAuth specific error handling
    if (request.path.startsWith('/oauth')) {
      const oauthError = this.getOAuthError(exception, message);

      // Set OAuth specific status codes
      if (oauthError.error === 'invalid_request') {
        status = HttpStatus.BAD_REQUEST;
      } else if (oauthError.error === 'invalid_client') {
        status = HttpStatus.UNAUTHORIZED;
      } else if (oauthError.error === 'invalid_grant') {
        status = HttpStatus.BAD_REQUEST;
      } else if (oauthError.error === 'unauthorized_client') {
        status = HttpStatus.BAD_REQUEST;
      } else if (oauthError.error === 'unsupported_grant_type') {
        status = HttpStatus.BAD_REQUEST;
      } else if (oauthError.error === 'invalid_scope') {
        status = HttpStatus.BAD_REQUEST;
      }

      return response.status(status).json(oauthError);
    }

    // Regular error response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      ...(process.env.NODE_ENV !== 'production' && {
        error: error,
        exception:
          exception instanceof Error
            ? {
                name: exception.name,
                message: exception.message,
                stack: exception.stack,
              }
            : exception,
      }),
    };

    response.status(status).json(errorResponse);
  }

  private getOAuthError(
    exception: unknown,
    defaultMessage: string,
  ): OAuthError {
    let oauthError = 'server_error';
    let description = defaultMessage;

    // Check if exception has OAuth error information
    if (exception && typeof exception === 'object') {
      const ex = exception as any;

      if (ex.oauth_error) {
        oauthError = ex.oauth_error;
      }

      if (ex.error_description) {
        description = ex.error_description;
      }

      // Map common errors to OAuth errors
      if (
        ex.status === HttpStatus.BAD_REQUEST ||
        ex.name === 'ValidationError'
      ) {
        oauthError = 'invalid_request';
      } else if (ex.status === HttpStatus.UNAUTHORIZED) {
        oauthError = 'invalid_client';
      }
    }

    return {
      error: oauthError,
      error_description: description,
    };
  }
}

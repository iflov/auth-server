import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, body } = req;
    const startTime = Date.now();

    // Skip logging for favicon requests
    const skipPaths = ['/favicon.ico'];
    const shouldSkip = skipPaths.includes(originalUrl);

    // Log request
    if (!shouldSkip) {
      this.logger.log(`⟶  ${method} ${originalUrl}`);
    }

    // Log request body in development
    if (
      process.env.NODE_ENV !== 'production' &&
      body &&
      Object.keys(body).length > 0
    ) {
      this.logger.debug(`Request body: ${JSON.stringify(body)}`);
    }

    // Capture original methods
    const originalSend = res.send;
    const originalJson = res.json;

    // Track response
    let responseBody: any;

    // Override send method
    res.send = function (data: any) {
      responseBody = data;
      return originalSend.call(this, data);
    };

    // Override json method
    res.json = function (data: any) {
      responseBody = data;
      return originalJson.call(this, data);
    };

    // Log response
    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;

      // Skip logging for favicon requests
      if (shouldSkip) {
        return;
      }

      // Determine log level based on status code
      if (statusCode >= 500) {
        this.logger.error(
          `⟵  ${method} ${originalUrl} ${statusCode} - ${responseTime}ms`,
        );
      } else if (statusCode >= 400) {
        this.logger.warn(
          `⟵  ${method} ${originalUrl} ${statusCode} - ${responseTime}ms`,
        );
      } else {
        this.logger.log(
          `⟵  ${method} ${originalUrl} ${statusCode} - ${responseTime}ms`,
        );
      }

      // Log response body in development for errors
      if (
        process.env.NODE_ENV !== 'production' &&
        statusCode >= 400 &&
        responseBody
      ) {
        this.logger.debug(`Response body: ${JSON.stringify(responseBody)}`);
      }
    });

    next();
  }
}

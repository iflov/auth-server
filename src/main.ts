import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SnakeCaseInterceptor } from './common/interceptors/snake-case.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust proxies so req.protocol reflects X-Forwarded-Proto in proxied setups
  app.set('trust proxy', true);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global response interceptor to convert camelCase keys to snake_case
  app.useGlobalInterceptors(new SnakeCaseInterceptor());

  // CORS configuration
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix for API - OAuth server는 prefix 없이 운영
  // const globalPrefix = process.env.API_PREFIX || 'api';
  // app.setGlobalPrefix(globalPrefix, {
  //   exclude: ['health', '/', '.well-known/*'],
  // });

  const port = process.env.PORT || 3001;
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);

  logger.log(`🚀 Application is running on: http://${host}:${port}`);
  logger.log(`📋 Health check: http://localhost:${port}/health`);
  logger.log(
    `🔐 OAuth metadata: http://localhost:${port}/.well-known/oauth-authorization-server`,
  );
  logger.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.log(`${signal} signal received, starting graceful shutdown...`);

    try {
      await app.close();
      logger.log('Application closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap();

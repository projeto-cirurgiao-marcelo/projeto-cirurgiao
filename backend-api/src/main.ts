import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { loadSecretsIntoEnv } from './config/secrets';
import { initSentry, SentryExceptionFilter } from './config/sentry';

const bootstrapLogger = new Logger('Bootstrap');

async function bootstrap() {
  // Hydrate process.env from Secret Manager BEFORE Nest instantiates anything.
  // In dev this is a no-op unless NODE_ENV=production.
  await loadSecretsIntoEnv({
    log: (msg) => bootstrapLogger.log(msg),
    logError: (msg, err) => bootstrapLogger.error(msg, err as any),
  });

  bootstrapLogger.log('Starting application...');
  bootstrapLogger.log(`NODE_ENV: ${process.env.NODE_ENV ?? '(unset)'}`);
  bootstrapLogger.log(`PORT: ${process.env.PORT || 3000}`);
  bootstrapLogger.log(`DATABASE_URL defined: ${!!process.env.DATABASE_URL}`);

  // Error tracking — no-op sem SENTRY_DSN. Depois de hidratar env, antes do app.
  const sentryEnabled = initSentry();
  bootstrapLogger.log(`Sentry: ${sentryEnabled ? 'enabled' : 'disabled (no SENTRY_DSN)'}`);

  const app = await NestFactory.create(AppModule);

  const isProduction = process.env.NODE_ENV === 'production';

  // Registra o filtro global só quando o Sentry está ativo — sem DSN, zero
  // mudança no comportamento de erros.
  if (sentryEnabled) {
    const { httpAdapter } = app.get(HttpAdapterHost);
    app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));
  }

  // Security headers (HSTS, X-Content-Type-Options, frameguard, etc.).
  // CSP fica desligado fora de produção pra não quebrar a UI do Swagger (dev-only).
  // ponytail: CSP default só em prod; se precisar CSP na API em prod, ajustar as directives aqui.
  app.use(helmet(isProduction ? undefined : { contentSecurityPolicy: false }));

  // Aumentar limite de tamanho do body para 50MB (para uploads grandes)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS — requer configuração explícita, sem fallback wildcard
  const corsOriginsEnv = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN;
  if (!corsOriginsEnv) {
    bootstrapLogger.warn(
      'CORS_ORIGINS não configurado! Usando localhost como fallback para desenvolvimento.',
    );
  }
  const corsOrigins = corsOriginsEnv
    ? corsOriginsEnv.split(',').map((origin) => origin.trim())
    : ['http://localhost:3001', 'http://localhost:3000'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation — nunca exposto em produção (information disclosure).
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Projeto Cirurgião API')
      .setDescription('API de autenticação e gestão de usuários para o Projeto Cirurgião')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Endpoints de autenticação')
      .addTag('users', 'Endpoints de gestão de usuários')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  bootstrapLogger.log(`Aplicação rodando na porta: ${port}`);
  if (!isProduction) {
    bootstrapLogger.log(`Documentação Swagger: http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((err) => {
  bootstrapLogger.error('Failed to start application', err);
  process.exit(1);
});
